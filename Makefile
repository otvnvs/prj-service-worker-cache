JS_FILES := $(shell find . -name "*.js")
HTML_FILES := $(shell find . -name "*.html")
CSS_FILES := $(shell find ./css -name "*.css")
PRETTIER_CONFIG := .prettierrc
PORT := 5555
TIMESTAMP := $(shell date +"%Y%m%d_%H%M%S_%3N")
BACKUP_DIR := ./bak/$(TIMESTAMP)
FAVICON=favicon.ico
GRADIENT=gradient.jpg
default: gradient favicon prettify
.PHONY: prettify serve backup favicon $(GRADIENT) $(FAVICON)
prettify:
	@for file in $(JS_FILES) $(HTML_FILES) $(CSS_FILES); do \
		prettier --config $(PRETTIER_CONFIG) --write "$$file"; \
	done
serve: $(FAVICON) $(GRADIENT)
	@darkhttpd ./ --port $(PORT)
backup:
	@mkdir -p $(BACKUP_DIR)
	@cp ./README.md $(BACKUP_DIR)/
	@cp ./*.js $(BACKUP_DIR)/
	@echo "Backup completed to $(BACKUP_DIR)"
favicon:
	@COLOR=$$(python3 -c "import random; print(f'#%06x' % random.randint(0, 0xFFFFFF))"); \
	convert -size 256x256 xc:none -fill "$$COLOR" -draw "circle 128,128 128,10" favicon.ico; \
	echo "Favicon created with color $$COLOR"
	echo "Gradient created: $$C1 to $$C2 at $$ANG degrees"
gradient:
	@C1=$$(python3 -c "import random; print('#%06x' % random.randint(0, 0xFFFFFF))"); \
	C2=$$(python3 -c "import random; print('#%06x' % random.randint(0, 0xFFFFFF))"); \
	ANG=$$(python3 -c "import random; print(random.randint(0, 359))"); \
	convert -size 256x256 -define gradient:angle=$$ANG gradient:"$$C1-$$C2" $(GRADIENT); \
	echo "Created gradient.jpg with colors $$C1, $$C2 at $$ANG°"
