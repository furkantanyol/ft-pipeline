import type { Provider, FineTuneConfig, JobStatus, Message } from './types.js';

export class TogetherProvider implements Provider {
  name = 'together';

  async uploadTrainingFile(_filePath: string): Promise<string> {
    // TODO: implement Together.ai file upload
    throw new Error('Not implemented');
  }

  async createFineTuneJob(_config: FineTuneConfig): Promise<string> {
    // TODO: implement Together.ai fine-tune job creation
    throw new Error('Not implemented');
  }

  async getJobStatus(_jobId: string): Promise<JobStatus> {
    // TODO: implement Together.ai job status check
    throw new Error('Not implemented');
  }

  async runInference(_model: string, _messages: Message[]): Promise<string> {
    // TODO: implement Together.ai inference
    throw new Error('Not implemented');
  }
}
