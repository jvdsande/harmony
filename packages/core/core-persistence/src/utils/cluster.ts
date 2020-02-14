import Cluster from 'cluster'

export function ifMaster(func : (cluster: typeof Cluster) => any) {
  if (Cluster.isMaster) {
    return func(Cluster)
  }
  return null
}

export function ifWorker(func : (worker: Cluster.Worker) => any) {
  if (Cluster.isWorker) {
    return func(Cluster.worker)
  }
  return null
}
