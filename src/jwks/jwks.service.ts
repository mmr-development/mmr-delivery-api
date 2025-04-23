import fs from 'fs';
import * as jose from 'node-jose';

export interface JwksService {
    getJwks(): Promise<any>;
}

export function createJwksService(): JwksService {
    return {
        getJwks: async () => {
            const publicKey = fs.readFileSync('keys/public.pem', 'utf8');

            const keystore = jose.JWK.createKeyStore();

            await keystore.add(publicKey, 'pem', {
                use: 'sig',
                alg: 'RS256',
                kid: '1',
            });

            return keystore.toJSON();
        }
    }
}