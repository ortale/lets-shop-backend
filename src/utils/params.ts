	/**
	 * Safely extract a string param from Express req.params.
	 * Express types params as string | string[] but in practice they are always string.
	 */
	export const param = (value: string | string[]): string =>
		Array.isArray(value) ? value[0] : value;
