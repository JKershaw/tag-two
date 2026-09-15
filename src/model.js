// Shared with plan.js because a second bounded operation now calls the same provider under the
// same caps. It is one transport and one price check, not a provider abstraction layer.
export const MODEL = 'deepseek/deepseek-chat-v3-0324';
const API = 'https://openrouter.ai/api/v1';

export async function request(path, options, fetchImpl) {
  let response;
  try {
    response = await fetchImpl(`${API}${path}`, { ...options, signal: AbortSignal.timeout(120_000) });
  } catch (error) {
    throw new Error(`OpenRouter unavailable (${error.cause?.code ?? error.name}). No retry was made.`);
  }
  if (!response.ok) throw new Error(`OpenRouter HTTP ${response.status}. No retry was made.`);
  return response.json();
}

// Deliberately conservative caps, not a general-purpose cost reservation system.
export async function affordable(fetchImpl) {
  const { data } = await request('/models', {}, fetchImpl);
  const model = data?.find(item => item.id === MODEL);
  const promptPrice = Number(model?.pricing?.prompt);
  const completionPrice = Number(model?.pricing?.completion);
  if (!model || !Number.isFinite(promptPrice) || promptPrice < 0 || promptPrice > 0.5 / 1e6
    || !Number.isFinite(completionPrice) || completionPrice < 0 || completionPrice > 1.5 / 1e6
    || Number(model.pricing.request ?? 0) !== 0) {
    throw new Error('Model unavailable or pricing exceeds the seed’s budget caps. Human review required.');
  }
}
