import crypto from 'crypto';
import os from 'os';
import { Request, Response, NextFunction } from 'express';

export class MobileAuthManager {
  private pairingToken: string;
  private requireAuth: boolean;

  constructor() {
    this.pairingToken =
      process.env.GHAZAL_PAIRING_TOKEN ||
      crypto.randomBytes(4).toString('hex').toUpperCase();
    this.requireAuth = process.env.GHAZAL_REQUIRE_MOBILE_AUTH === 'true';
  }

  getLanAddresses(): string[] {
    const nets = os.networkInterfaces();
    const ips: string[] = [];
    for (const iface of Object.values(nets)) {
      if (!iface) continue;
      for (const info of iface) {
        if (info.family === 'IPv4' && !info.internal) {
          ips.push(info.address);
        }
      }
    }
    return ips;
  }

  getConnectionInfo(port: number) {
    const ips = this.getLanAddresses();
    return {
      localUrl: `http://localhost:${port}`,
      lanUrls: ips.map((ip) => `http://${ip}:${port}`),
      mobileWebUrls: ips.map((ip) => `http://${ip}:5173`),
      pairingToken: this.pairingToken,
      requireAuth: this.requireAuth,
    };
  }

  regenerateToken() {
    this.pairingToken = crypto.randomBytes(4).toString('hex').toUpperCase();
    return this.pairingToken;
  }

  setRequireAuth(enabled: boolean) {
    this.requireAuth = enabled;
  }

  middleware = (req: Request, res: Response, next: NextFunction) => {
    if (!this.requireAuth) return next();
    const ip = req.ip || req.socket.remoteAddress || '';
    const isLocal = ip.includes('127.0.0.1') || ip.includes('::1') || ip === '::ffff:127.0.0.1';
    if (isLocal) return next();

    const headerToken = req.headers['x-ghazal-token'] || req.query.token;
    if (headerToken === this.pairingToken) return next();

    return res.status(401).json({ error: 'Invalid or missing GHAZAL mobile pairing token' });
  };
}
