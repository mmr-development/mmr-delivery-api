import { FastifyPluginAsync } from 'fastify'
import fp from 'fastify-plugin'
import { Kysely } from 'kysely'
import { Database } from '../database'

declare module 'fastify' {
    interface FastifyRequest {
        db: Kysely<Database>
    }
}

export interface KyselyContextOptions {
    db: Kysely<Database>
}

const kyselyContextPlugin: FastifyPluginAsync<KyselyContextOptions> = async (fastify, options) => {
    fastify.decorateRequest('db', {
        getter: () => options.db
    })

    fastify.addHook('onClose', async () => {
        await options.db.destroy()
    })
}

export default fp(kyselyContextPlugin)
