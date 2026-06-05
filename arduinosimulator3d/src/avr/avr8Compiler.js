const WOKWI_HEXI_BUILD_URL = 'https://hexi.wokwi.com/build';
const DEFAULT_COMPILE_TIMEOUT_MS = 20000;

export async function compileArduinoSketch(source, options = {}) {
  const controller = new AbortController();
  const timeoutMs = Number(options.timeoutMs) > 0
    ? Number(options.timeoutMs)
    : DEFAULT_COMPILE_TIMEOUT_MS;

  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    const response = await fetch(WOKWI_HEXI_BUILD_URL, {
      method: 'POST',
      mode: 'cors',
      cache: 'no-cache',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sketch: String(source || ''),
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Compiler request failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();

    return {
      stdout: typeof result?.stdout === 'string' ? result.stdout : '',
      stderr: typeof result?.stderr === 'string' ? result.stderr : '',
      hex: typeof result?.hex === 'string' ? result.hex : '',
    };
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error('Compilation timed out while waiting for the sketch compiler.');
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
