# Replace your-registry.example.com/octoweb with your own container registry path
build:
	docker build -t octoweb .
deploy:
	docker build -t octoweb  .
	docker tag octoweb your-registry.example.com/octoweb:latest
	docker push your-registry.example.com/octoweb:latest
