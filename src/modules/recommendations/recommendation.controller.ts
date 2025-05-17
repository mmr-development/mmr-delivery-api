export interface RecommendationControllerOptions {
    recommendationService: RecommendationService;
}

export const recommendationController: FastifyPluginAsync<RecommendationControllerOptions> = 
  async function (server, { recommendationService }) {
    server.withTypeProvider<TypeBoxTypeProvider>().get('/recommendations/popular', { 
        schema: { tags: ['Recommendations'] },

    }, async (request, reply) => {
        const popular = await recommendationService.getPopularItems(3);
        return reply.code(200).send({ recommendations: popular });
    });
    
    server.withTypeProvider<TypeBoxTypeProvider>().get('/recommendations/personalized', {
        schema: { tags: ['Recommendations'] },
        preHandler: [server.authenticate]
    }, async (request, reply) => {
        const userId = request.user.sub;
        const personalized = await recommendationService.getPersonalizedRecommendations(userId, 3);
        return reply.code(200).send({ recommendations: personalized });
    });
}