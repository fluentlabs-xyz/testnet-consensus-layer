.PHONY: generate-jwt-secret
generate-jwt-secret:
	[ -f jwt.hex ] || head -c 32 /dev/urandom | xxd -p -c 32 > jwt.hex