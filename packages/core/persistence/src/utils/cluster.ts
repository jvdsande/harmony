import Cluster from 'cluster'

export function ifMaster(func) {
  if (Cluster.isMaster) {
    return func(Cluster)
  }
  return null
}

export function ifWorker(func) {
  if (Cluster.isWorker) {
    return func(Cluster.worker)
  }
  return null
}
