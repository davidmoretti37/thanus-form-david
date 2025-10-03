export class AudioManager {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private audioWorkletNode: AudioWorkletNode | null = null;
  private isRecording = false;

  async initialize(): Promise<void> {
    try {
      // Cria contexto de áudio
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Solicita permissão para microfone
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 24000, // OpenAI Realtime API usa 24kHz
        },
      });

      console.log('AudioManager initialized successfully');
    } catch (error) {
      console.error('Failed to initialize audio:', error);
      throw new Error('Não foi possível acessar o microfone. Verifique as permissões.');
    }
  }

  async startRecording(onAudioData: (audioData: Float32Array) => void): Promise<void> {
    if (!this.audioContext || !this.mediaStream) {
      throw new Error('AudioManager não foi inicializado');
    }

    this.isRecording = true;

    const source = this.audioContext.createMediaStreamSource(this.mediaStream);
    const processor = this.audioContext.createScriptProcessor(4096, 1, 1);

    processor.onaudioprocess = (e) => {
      if (!this.isRecording) return;
      
      const inputData = e.inputBuffer.getChannelData(0);
      
      // Reamostra de 48kHz para 24kHz se necessário
      const resampled = this.resample(inputData, this.audioContext!.sampleRate, 24000);
      onAudioData(resampled);
    };

    source.connect(processor);
    processor.connect(this.audioContext.destination);
  }

  stopRecording(): void {
    this.isRecording = false;
  }

  async playAudio(audioData: ArrayBuffer): Promise<void> {
    if (!this.audioContext) {
      throw new Error('AudioManager não foi inicializado');
    }

    try {
      const audioBuffer = await this.audioContext.decodeAudioData(audioData);
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.audioContext.destination);
      source.start();
    } catch (error) {
      console.error('Failed to play audio:', error);
    }
  }

  // Converte PCM16 para base64 para enviar via WebSocket
  pcm16ToBase64(float32Array: Float32Array): string {
    const pcm16 = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    
    const uint8Array = new Uint8Array(pcm16.buffer);
    let binary = '';
    for (let i = 0; i < uint8Array.length; i++) {
      binary += String.fromCharCode(uint8Array[i]);
    }
    return btoa(binary);
  }

  // Converte base64 para ArrayBuffer para reproduzir
  base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }

  private resample(
    audioData: Float32Array,
    originalSampleRate: number,
    targetSampleRate: number
  ): Float32Array {
    if (originalSampleRate === targetSampleRate) {
      return audioData;
    }

    const ratio = originalSampleRate / targetSampleRate;
    const newLength = Math.round(audioData.length / ratio);
    const result = new Float32Array(newLength);

    for (let i = 0; i < newLength; i++) {
      const index = i * ratio;
      const indexFloor = Math.floor(index);
      const indexCeil = Math.min(indexFloor + 1, audioData.length - 1);
      const fraction = index - indexFloor;

      result[i] = audioData[indexFloor] * (1 - fraction) + audioData[indexCeil] * fraction;
    }

    return result;
  }

  async cleanup(): Promise<void> {
    this.stopRecording();

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    if (this.audioContext) {
      await this.audioContext.close();
      this.audioContext = null;
    }
  }

  getAudioContext(): AudioContext | null {
    return this.audioContext;
  }
}

// Instância singleton
export const audioManager = new AudioManager();
