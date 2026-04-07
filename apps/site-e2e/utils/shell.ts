import { A7Ctx } from '../req/dashboard/common';
import {
  GetHelmDeploymentScript,
  a7GetHelmDeploymentScript,
} from '../req/dashboard/gateway';
import { waitForPort } from './helper';

const tinyexecPromise = import('tinyexec').then((m) => m.x);

type ExcludeFirst<T extends any[]> = T extends [any, ...infer Rest]
  ? Rest
  : never;
type XArgs = ExcludeFirst<Parameters<Awaited<typeof tinyexecPromise>>>;

const xParams = [[], { nodeOptions: { shell: true } }] as XArgs;
export const x = async (cmd: string, ...args: XArgs) => {
  const baseX = await tinyexecPromise;
  return baseX(cmd, ...([...xParams, ...args] as XArgs));
};

export const k8NS = 'api7';

export const k8WaitReady = async (label: string, ns = k8NS, timeout = 300) => {
  return await x(
    `kubectl wait --for=condition=ready pod -l ${label} -n ${ns} --timeout=${timeout}s`
  ).then(({ exitCode, stderr }) => {
    if (exitCode !== 0) throw new Error(stderr);
  });
};

export const k8PortForward = async (
  label: string,
  portForward: `${string}:${string}`,
  ns = k8NS
) => {
  const [localPort] = portForward.split(':');

  // Kill existing port-forward processes
  await x(
    `pkill -f "kubectl.*port-forward.*${localPort}" || true`,
    []
  );

  // Brief wait for port to be released
  await new Promise((r) => setTimeout(r, 500));

  const logId = label.split('/').join('-');
  const op = `kubectl port-forward -n ${ns} ${label} ${portForward} -v 10 > /tmp/portforward-${logId}-${+Date.now()}.log 2>&1 &`;
  const { exitCode, stderr } = await x(op);
  if (exitCode !== 0) throw new Error(stderr);

  // Wait for port to be listening
  await waitForPort(parseInt(localPort), 30000);
};

export const restartDevPortal = async (
  deploymentName = 'developer-portal',
  serviceName = 'developer-portal',
  portForward: `${string}:${string}` = '3001:3001',
  ns = k8NS
) => {
  await x(`kubectl rollout restart deployment/${deploymentName} -n ${ns}`);
  await k8WaitReady(`app=${deploymentName}`, ns, 300);
  await new Promise((resolve) => setTimeout(resolve, 5000));
  await k8PortForward(`svc/${serviceName}`, portForward, ns);
};

export const k8KeyCloakPort = 8080;
export const k8DeployKeyCloak = async (port = k8KeyCloakPort) => {
  await x(
    `kubectl apply -f ./apps/site-e2e/fixtures/keycloak/keycloak.yaml -n ${k8NS}`
  );
  await k8WaitReady('app=keycloak');
  await k8PortForward('svc/api7ee3-keycloak', `${port}:8080`);
};

export const fixturesPath = './apps/site-e2e/fixtures';
export const k8DeleteKeyCloak = async () => {
  await x(
    `kubectl delete -f ${fixturesPath}/keycloak/keycloak.yaml -n ${k8NS} --wait`
  ).then((out) => {
    console.log('delete keycloak Result', JSON.stringify(out));
  });
};

export const k8DeployLDAP = async (ns = k8NS) => {
  if (ns !== k8NS) await x(`kubectl namespace ${ns}`);
  await x(`kubectl create secret generic openldap-certs \
  --from-file=ldapserver.crt=${fixturesPath}/ldap/ldapserver.crt \
  --from-file=ldapserver.key=${fixturesPath}/ldap/ldapserver.key \
  --from-file=ldapCA.crt=${fixturesPath}/ldap/ldapCA.crt \
  --namespace ${ns}`);
  await x(`kubectl apply -f ${fixturesPath}/ldap/openldap.yaml -n ${ns}`);
  await k8WaitReady('app.kubernetes.io/name=openldap');
};

export const k8DeleteLDAP = async (ns = k8NS) => {
  await x(
    `kubectl delete -f ${fixturesPath}/ldap/openldap.yaml -n ${ns} --wait`
  ).then((out) => {
    console.log('delete ldap Result', JSON.stringify(out));
  });
};

export const k8DeployA7Gateway = async (
  ctx: A7Ctx,
  data: GetHelmDeploymentScript
) => {
  const name = data.name || 'api7-ee-3-gateway';
  const ns = data.namespace || k8NS;
  // clear old secret if exist
  await x(`kubectl delete secret ${name}-tls -n ${ns} --ignore-not-found`);

  const script = await a7GetHelmDeploymentScript(ctx, data);
  const { REGISTRY, REGISTRY_NS } = process.env;
  const finalScript = script
    // replace image with dev version
    .replace(
      'repository=api7/api7-ee-3-gateway',
      `repository=${REGISTRY}/${REGISTRY_NS}/api7-ee-3-gateway`
    )
    // prevent `//` from being converted to `/`
    .replaceAll('https://', 'https:\\/\\/');
  const { stdout, stderr, exitCode } = await x(finalScript);
  if (exitCode !== 0) throw new Error(stderr);
  console.log('deploy gateway instance', stdout, finalScript);
  // wait ready
  await k8WaitReady('app.kubernetes.io/instance=api7-ee-3-gateway');
};

/** default uninstall the gateway */
export const k8HelmUninstall = async (
  data: Pick<GetHelmDeploymentScript, 'name' | 'namespace'> = {}
) => {
  const { name = 'api7-ee-3-gateway', namespace = k8NS } = data;

  // Check if release exists first
  const { exitCode } = await x(`helm status ${name} -n ${namespace}`);
  if (exitCode !== 0) {
    console.log(`Helm release ${name} not found, skipping uninstall`);
    return;
  }

  await x(`helm uninstall ${name} -n ${namespace} --wait`).then((out) => {
    console.log('Helm Uninstall Result', JSON.stringify(out));
  });

  // Wait for pods to be fully terminated (ignore errors if no pods exist)
  await x(
    `kubectl wait --for=delete pod -l app.kubernetes.io/instance=${name} -n ${namespace} --timeout=60s`
  ).catch(() => {});
};

export const k8DeployCas = async (ns = k8NS) => {
  await x(`kubectl apply -f ${fixturesPath}/cas/cas.yaml -n ${ns}`);
  await k8WaitReady('app=cas-server', ns, 600);
  await k8PortForward('svc/cas-server', '8089:8089');
};

export const k8DeleteCas = async (ns = k8NS) => {
  await x(
    `kubectl delete -f ${fixturesPath}/cas/cas.yaml -n ${ns} --wait`
  ).then((out) => {
    console.log('delete cas Result', JSON.stringify(out));
  });
};
