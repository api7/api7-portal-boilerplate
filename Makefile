LINUX_ARCH := amd64 arm64
IMAGE_TAG ?= dev

ARCH ?= amd64
ifeq ($(shell uname -m),arm64)
ARCH = arm64
endif
ifeq ($(shell uname -m),aarch64)
ARCH = arm64
endif

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
