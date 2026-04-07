import { ConfigMapData } from '@site/lib/config/schema';
import { parseYaml, stringifyYaml } from './helper';
import { k8NS, x } from './shell';

const DEFAULT_CONFIGMAP_NAME = 'developer-portal-config';

function isK8sNotFoundError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const maybeError = error as {
    statusCode?: number;
    response?: { status?: number };
    body?: { code?: number };
  };

  return (
    maybeError.statusCode === 404 ||
    maybeError.response?.status === 404 ||
    maybeError.body?.code === 404
  );
}

const getCoreV1Api = async () => {
  const k8s = await import('@kubernetes/client-node');
  const kc = new k8s.KubeConfig();
  kc.loadFromDefault();
  return kc.makeApiClient(k8s.CoreV1Api);
};

export async function getConfigMapYaml(
  configMapName = DEFAULT_CONFIGMAP_NAME,
  ns = k8NS
): Promise<string> {
  const { stdout } = await x(
    `kubectl get configmap ${configMapName} -n ${ns} -o jsonpath='{.data.config\\.yaml}'`
  );
  return stdout;
}

export async function updateConfigMapYaml(
  configYaml: string,
  configMapName = DEFAULT_CONFIGMAP_NAME,
  ns = k8NS
): Promise<void> {
  try {
    const coreV1Api = await getCoreV1Api();

    let existingConfigMap;
    try {
      existingConfigMap = await coreV1Api.readNamespacedConfigMap({
        name: configMapName,
        namespace: ns,
      });
    } catch (error: unknown) {
      if (isK8sNotFoundError(error)) {
        const newConfigMap = {
          apiVersion: 'v1',
          kind: 'ConfigMap',
          metadata: {
            name: configMapName,
            namespace: ns,
          },
          data: {
            'config.yaml': configYaml,
          },
        };
        await coreV1Api.createNamespacedConfigMap({
          namespace: ns,
          body: newConfigMap,
        });
        return;
      }
      throw error;
    }

    existingConfigMap.data ??= {};
    existingConfigMap.data['config.yaml'] = configYaml;
    await coreV1Api.replaceNamespacedConfigMap({
      name: configMapName,
      namespace: ns,
      body: existingConfigMap,
    });
  } catch (error) {
    throw new Error(
      `Failed to update ConfigMap: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

export async function patchConfigMapYaml<T extends object = ConfigMapData>(
  mutator: (config: T) => void | Promise<void>,
  configMapName = DEFAULT_CONFIGMAP_NAME,
  ns = k8NS
): Promise<void> {
  try {
    const coreV1Api = await getCoreV1Api();
    const currentConfigMap = await coreV1Api.readNamespacedConfigMap({
      name: configMapName,
      namespace: ns,
    });
    const currentConfigYaml = currentConfigMap.data?.['config.yaml'];
    if (!currentConfigYaml) {
      throw new Error('ConfigMap does not contain config.yaml data');
    }

    const configObj = parseYaml<T>(currentConfigYaml);
    await mutator(configObj);

    currentConfigMap.data ??= {};
    currentConfigMap.data['config.yaml'] = stringifyYaml(configObj);
    await coreV1Api.replaceNamespacedConfigMap({
      name: configMapName,
      namespace: ns,
      body: currentConfigMap,
    });
    await new Promise((resolve) => setTimeout(resolve, 1000));
  } catch (error) {
    throw new Error(
      `Failed to patch ConfigMap: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}
