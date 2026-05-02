export function createVectorIndex({ enableVector, embeddingProvider } = {}) {
  if (!enableVector) {
    return {
      available: false,
      reason: 'Vector search disabled',
      async indexChunks() {},
      async search() {
        return [];
      }
    };
  }

  if (!embeddingProvider || embeddingProvider === 'none') {
    return {
      available: false,
      reason: 'Vector search requires an embedding provider',
      async indexChunks() {},
      async search() {
        return [];
      }
    };
  }

  return {
    available: false,
    reason: 'sqlite-vec integration not installed yet',
    async indexChunks() {},
    async search() {
      return [];
    }
  };
}
