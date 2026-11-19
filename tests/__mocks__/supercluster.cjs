class Supercluster {
  constructor() {}

  load() {}

  getClusters(bbox, zoom) {
    return [];
  }

  getChildren(clusterId) {
    return [];
  }

  getLeaves(clusterId, limit, offset) {
    return [];
  }

  getClusterExpansionZoom(clusterId) {
    return 1;
  }
}

module.exports = Supercluster;
