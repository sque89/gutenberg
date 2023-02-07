# Add 5 Paragraphs with text
for i in {1..5}; do \
adb shell input tap 1000 718; \
  sleep 3; \
  adb shell input keyevent 66; \
  sleep 3; \
  adb shell input text 'A\ quick\ brown\ fox\ jumps\ over\ the\ lazy\ dog.'; \
  sleep 6; \
	done
