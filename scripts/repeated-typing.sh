adb shell input tap 1000 668; \
  sleep 3; \
	for i in {1..10}; do \
  adb shell input text '\ A\ quick\ brown\ fox\ jumps\ over\ the\ lazy\ dog.'; \
	done;
