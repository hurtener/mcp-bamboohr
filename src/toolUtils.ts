export function jsonTextResult(payload: unknown) {
  return {
    content: [{
      type: 'text' as const,
      text: JSON.stringify(payload, null, 2),
    }],
  };
}

export function errorTextResult(prefix: string, error: unknown) {
  return {
    content: [{
      type: 'text' as const,
      text: `${prefix}: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }],
    isError: true,
  };
}
