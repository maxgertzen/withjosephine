const openNextHandler = {
  fetch: async () => new Response(null, { status: 404 }),
};

export default openNextHandler;

export class BucketCachePurge {}
export class DOQueueHandler {}
export class DOShardedTagCache {}
