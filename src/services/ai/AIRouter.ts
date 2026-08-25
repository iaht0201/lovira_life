import { LifeSession } from '../../types';
import { GroqModel } from './GroqProvider';

export function selectGroqModel(message: string, session?: LifeSession | null): GroqModel {
  const text = message.toLowerCase();

  // 1. Deep reasoning required (Conflict resolution, planning, multi-step tradeoff)
  if (
    text.includes('trễ') ||
    text.includes('nên làm gì trước') ||
    text.includes('xung đột') ||
    text.includes('không kịp') ||
    text.includes('ưu tiên') ||
    (text.length > 150 && (text.includes('và') || text.includes('hoặc')))
  ) {
    return GroqModel.LLAMA_3_3_70B;
  }

  // 2. Complex natural language interpretation / dialect / ambiguous phrasing
  if (
    text.includes('cái lúc nãy') ||
    text.includes('bác sĩ vừa nói') ||
    text.includes('phòng đó') ||
    text.includes('bước vừa rồi') ||
    text.includes('chuyển tôi sang')
  ) {
    return GroqModel.LLAMA_3_3_70B;
  }

  // 3. Fast lightweight responses for short commands or simple prompts
  if (text.length < 15) {
    return GroqModel.LLAMA_3_1_8B;
  }

  // 4. Default fast text model
  return GroqModel.LLAMA_3_1_8B;
}


