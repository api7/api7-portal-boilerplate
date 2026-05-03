CLUSTER_NAME ?= api7ee-e2e
export KUBECONFIG = /tmp/${CLUSTER_NAME}.kubeconfig

LINUX_ARCH := amd64 arm64
NS = api7
IMAGE_TAG ?= dev
IMAGE_E2E ?= api7-ee-developer-portal-e2e
DASHBOARD_IMAGE_TAG ?= dev
PARALLEL ?= 5
PORT ?= 3001

ARCH ?= amd64
ifeq ($(shell uname -m),arm64)
ARCH = arm64
endif
ifeq ($(shell uname -m),aarch64)
ARCH = arm64
endif

IMAGES = \
	api7/keycloak:21.1.1-debian-11-r8 \
	api7/postgresql:15.4.0-debian-11-r45 \
	busybox:1.28 \
	${REGISTRY}/${REGISTRY_NS}/api7-ee-3-gateway:dev \
	${REGISTRY}/${REGISTRY_NS}/api7-ee-dp-manager:dev \
	${REGISTRY}/${REGISTRY_NS}/api7-ee-3-integrated:${DASHBOARD_IMAGE_TAG} \
	${REGISTRY}/${REGISTRY_NS}/api7-ee-developer-portal:dev

default: help
help:
	awk 'BEGIN {FS = ":.*##"; printf "\nUsage:\n  make \033[36m<target>\033[0m\n"} /^[a-zA-Z0-9_-]+:.*?##/ { printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2 } /^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 5) } ' ${MAKEFILE_LIST}
.PHONY: help

install:
	pnpm i --frozen-lockfile
.PHONY: install

build:
	cd apps/site && pnpm build
.PHONY: build

# build and push single-arch release image with testing features disabled
push-release-image:
	docker build -f Dockerfile \
		-t ${REGISTRY}/${REGISTRY_NS}/api7-ee-developer-portal-fe:${IMAGE_TAG}-${ARCH} .
	docker push ${REGISTRY}/${REGISTRY_NS}/api7-ee-developer-portal-fe:${IMAGE_TAG}-${ARCH}
.PHONY: push-release-image

# build and push single-arch dev image with testing features enabled
push-dev-image:
	docker build -f Dockerfile \
		-t ${REGISTRY}/${REGISTRY_NS}/api7-ee-developer-portal-fe:${IMAGE_TAG}-${ARCH} . \
		--build-arg NEXT_PUBLIC_TESTING=true
	docker push ${REGISTRY}/${REGISTRY_NS}/api7-ee-developer-portal-fe:${IMAGE_TAG}-${ARCH}
.PHONY: push-dev-image

# create and push multi-arch manifest
docker-manifest:
	for arch in $(LINUX_ARCH); do \
	    docker manifest create --amend ${REGISTRY}/${REGISTRY_NS}/api7-ee-developer-portal-fe:${IMAGE_TAG} ${REGISTRY}/${REGISTRY_NS}/api7-ee-developer-portal-fe:${IMAGE_TAG}-$${arch}; \
	    docker manifest annotate ${REGISTRY}/${REGISTRY_NS}/api7-ee-developer-portal-fe:${IMAGE_TAG} ${REGISTRY}/${REGISTRY_NS}/api7-ee-developer-portal-fe:${IMAGE_TAG}-$${arch} --arch $${arch}; \
	done
	docker manifest push ${REGISTRY}/${REGISTRY_NS}/api7-ee-developer-portal-fe:${IMAGE_TAG}
.PHONY: docker-manifest

sign-image-oidc:
	./dev-tools/sign-image-oidc.sh
.PHONY: sign-image-oidc

pull-images: 
	echo ${IMAGES} | xargs -n 1 -P ${PARALLEL} docker pull
.PHONY: pull-images

kind-up:
	KIND_CLUSTER_NAME=${CLUSTER_NAME} ./dev-tools/kind.sh
	kind get kubeconfig --name ${CLUSTER_NAME} > ${KUBECONFIG}
	mkdir -p ~/.kube
	cp ${KUBECONFIG} ~/.kube/config
.PHONY: kind-up

kind-down:
	kind delete clusters ${CLUSTER_NAME}
.PHONY: kind-down

kind-load-infra-images: pull-images
	echo ${IMAGES} | xargs -n 1 -P ${PARALLEL} kind load docker-image --nodes "${CLUSTER_NAME}-worker" --name "${CLUSTER_NAME}"
.PHONY: kind-load-infra-images

kind-install-chart:
	kubectl get namespace | grep -q "^${NS} " || kubectl create namespace ${NS}
	# helm repo add api7 https://charts.api7.ai
	helm repo add ingress https://charts.apiseven.com
	helm repo update
	# TODO: use api7 chart
	curl -C - --retry 5 ${CHART_URL} -o api7ee3-dev.tgz
	helm upgrade --install api7ee3 -n ${NS} --values ./dev-tools/values.yaml \
		--set dashboard.image.repository=${REGISTRY}/${REGISTRY_NS}/api7-ee-3-integrated \
		--set dashboard.image.tag=${DASHBOARD_IMAGE_TAG} \
		--set dp_manager.image.repository=${REGISTRY}/${REGISTRY_NS}/api7-ee-dp-manager \
		--set developer_portal.image.repository=${REGISTRY}/${REGISTRY_NS}/api7-ee-developer-portal \
		./api7ee3-dev.tgz
.PHONY: kind-install-chart

kind-port-forward-dashboard:
	-pkill -f "kubectl.*port-forward.*3000" || true
	kubectl wait --for=condition=Ready pods -l app.kubernetes.io/instance=api7ee3 -n ${NS} --timeout=300s
	kubectl port-forward -n ${NS} svc/${CLUSTER_NAME}-dashboard 3000:7080 -v 10 > /tmp/portforward-`date "+%H-%M-%S"`.log 2>&1 &
.PHONY: kind-port-forward-dashboard

kind-port-forward-devportal-api:
	-pkill -f "kubectl.*port-forward.*4321" || true
	kubectl wait --for=condition=Ready pods -l app.kubernetes.io/instance=api7ee3 -n ${NS} --timeout=300s
	kubectl port-forward -n ${NS} svc/${CLUSTER_NAME}-developer-portal 4321:4321 -v 10 > /tmp/portforward-`date "+%H-%M-%S"`.log 2>&1 &
.PHONY: kind-port-forward-devportal-api

kind-build-devportal:
	docker buildx build --no-cache -t ${IMAGE_E2E}:${IMAGE_TAG} . --build-arg NEXT_PUBLIC_TESTING=true
.PHONY: kind-build-devportal

kind-deploy-devportal:
	@if [ -z "$(PORTAL_TOKEN)" ]; then \
		echo "Error: PORTAL_TOKEN is required. Usage: make kind-deploy-devportal PORTAL_TOKEN=your-token"; \
		exit 1; \
	fi
	-kubectl delete -f ./dev-tools/devportal.yaml --ignore-not-found
	-kubectl wait --for=delete pods -l app=developer-portal -n ${NS} --timeout=60s || true
	kind load docker-image --nodes ${CLUSTER_NAME}-worker --name ${CLUSTER_NAME} ${IMAGE_E2E}:${IMAGE_TAG}
	PORTAL_TOKEN=$(PORTAL_TOKEN) envsubst '$$PORTAL_TOKEN' < ./dev-tools/devportal.yaml | kubectl apply -f -
	kubectl wait --for=condition=Ready pods -l app=developer-portal -n ${NS} --timeout=300s
.PHONY: kind-deploy-devportal

kind-rm-devportal:
	kubectl delete -f ./dev-tools/devportal.yaml --wait
.PHONY: kind-rm-devportal

kind-port-forward-devportal:
	-pkill -f "kubectl.*port-forward.*${PORT}" || true
	kubectl wait --for=condition=Ready pods -l app=developer-portal -n ${NS} --timeout=300s
	kubectl port-forward -n ${NS} svc/developer-portal ${PORT}:${PORT} -v 10 > /tmp/portforward-dev-`date "+%H-%M-%S"`.log 2>&1 &
.PHONY: kind-port-forward-devportal

kind-deploy-httpbin:
	kubectl apply -k github.com/mccutchen/go-httpbin/kustomize -n default
	kubectl wait --for=condition=Ready pods -l app.kubernetes.io/name=httpbin -n default --timeout=300s
	kubectl port-forward -n default svc/httpbin 17080:80 -v 10 > /tmp/portforward-httpbin-`date "+%H-%M-%S"`.log 2>&1 &
.PHONY: kind-deploy-httpbin

kind-deploy-keycloak:
	kubectl apply -f ./apps/site-e2e/fixtures/keycloak/keycloak.yaml -n ${NS}
	kubectl wait --for=condition=Ready pods -l app=keycloak -n ${NS} --timeout=300s
	kubectl port-forward -n ${NS} svc/api7ee3-keycloak 8080:8080 -v 10 > /tmp/portforward-keycloak-`date "+%H-%M-%S"`.log 2>&1 &
.PHONY: kind-deploy-keycloak

kind-deploy-smtp4dev:
	kubectl apply -f ./apps/site-e2e/fixtures/smtp4dev/smtp4dev.yaml -n ${NS}
	kubectl wait --for=condition=Ready pods -l app=smtp4dev -n ${NS} --timeout=300s
	kubectl port-forward -n ${NS} svc/smtp4dev 8000:80 -v 10 > /tmp/portforward-smtp4dev-`date "+%H-%M-%S"`.log 2>&1 &
	kubectl port-forward -n ${NS} svc/smtp4dev 2525:25 -v 10 > /tmp/portforward-smtp4dev-`date "+%H-%M-%S"`.log 2>&1 &
.PHONY: kind-deploy-smtp4dev

kind-rm-keycloak:
	kubectl delete -f ./apps/site-e2e/fixtures/keycloak/keycloak.yaml -n ${NS} --wait
.PHONY: kind-rm-keycloak

load-local-dashboard-image:
	docker tag api7-ee-3-integrated-e2e:dev ${REGISTRY}/${REGISTRY_NS}/api7-ee-3-integrated:dev
	kind load docker-image --nodes "${CLUSTER_NAME}-worker" --name "${CLUSTER_NAME}" ${REGISTRY}/${REGISTRY_NS}/api7-ee-3-integrated:dev
	kubectl -n ${NS} rollout restart deployment ${CLUSTER_NAME}-dashboard
	make kind-port-forward-dashboard
.PHONY: load-local-dashboard-image

run-test-server: kind-load-infra-images kind-install-chart kind-port-forward-dashboard kind-deploy-keycloak kind-deploy-smtp4dev kind-deploy-httpbin
	@echo "Dashboard is running, please visit http://localhost:3000"
.PHONY: run-test-server

rm-test-server:
	helm uninstall api7ee3 --namespace ${NS}
	pkill -f "kubectl.*port-forward" || true
