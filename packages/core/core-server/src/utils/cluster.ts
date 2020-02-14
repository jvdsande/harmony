import Cluster from 'cluster'
import Fork from 'socketio-sticky-session'

export async function executeOnCluster({
  cluster,
  prepare,
  main,
  worker,
  listen,
  onWorkerMount,
  onWorkerExit,
}) {
  const clusterMode = cluster && cluster.forks && cluster.forks.size > 1

  if (!clusterMode) {
    // If not in cluster mode, simply launch the server
    await main()
    await listen()
  } else {
    // If in cluster mode, launch server on workers only
    const port = await prepare()

    // Disable logs for workers except the first one
    if (Cluster.isWorker) {
      onWorkerMount(Cluster.worker)
    }

    // On master, register an event listener for detecting dying workers
    if (Cluster.isMaster) {
      Cluster.on('exit', (w) => {
        onWorkerExit(w)
      })
    }

    // On workers, launch the servers
    if (Cluster.isWorker) {
      await main()
    }

    // Fork the process accordingly to the 'cluster' setting
    Fork(
      {
        proxy: cluster.forks.proxy, // activate layer 4 patching
        header: cluster.forks.header || 'x-forwarded-for',
        ignoreMissingHeader: true,
        num: (cluster.forks.size) || 1,
      },
      worker,
    )
    // Listen on the given port
      .listen(port, () => listen(port))
  }
}

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
