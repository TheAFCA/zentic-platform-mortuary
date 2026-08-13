import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { HlsPlayerComponent } from './hls-player.component';

const hlsMockState = vi.hoisted(() => ({
  instances: [] as unknown[],
  supported: true,
}));

vi.mock('hls.js', () => {
  class MockHls {
    static readonly Events = {
      MEDIA_ATTACHED: 'media-attached',
      MANIFEST_PARSED: 'manifest-parsed',
      ERROR: 'error',
      FRAG_LOADED: 'frag-loaded',
    };

    static isSupported(): boolean {
      return hlsMockState.supported;
    }

    readonly attachMedia = vi.fn();
    readonly loadSource = vi.fn();
    readonly on = vi.fn();
    readonly startLoad = vi.fn();
    readonly recoverMediaError = vi.fn();
    readonly destroy = vi.fn();

    constructor() {
      hlsMockState.instances.push(this);
    }
  }

  return { default: MockHls };
});

interface MockHlsInstance {
  attachMedia: ReturnType<typeof vi.fn>;
  loadSource: ReturnType<typeof vi.fn>;
  on: ReturnType<typeof vi.fn>;
  startLoad: ReturnType<typeof vi.fn>;
  recoverMediaError: ReturnType<typeof vi.fn>;
  destroy: ReturnType<typeof vi.fn>;
}

function latestHlsInstance(): MockHlsInstance {
  const instance = hlsMockState.instances.at(-1);
  if (!instance) throw new Error('No se creó una instancia de Hls');
  return instance as MockHlsInstance;
}

function emitHls(instance: MockHlsInstance, event: string, ...args: unknown[]): void {
  const calls = instance.on.mock.calls as unknown[][];
  const registration = calls.find(([registeredEvent]) => registeredEvent === event);
  const listener = registration?.[1];
  if (typeof listener !== 'function') {
    throw new Error(`No existe listener para ${event}`);
  }
  (listener as (...listenerArgs: unknown[]) => void)(...args);
}

describe('HlsPlayerComponent', () => {
  let fixture: ComponentFixture<HlsPlayerComponent>;
  let loadSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    hlsMockState.instances.length = 0;
    hlsMockState.supported = true;
    loadSpy = vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => undefined);
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);

    await TestBed.configureTestingModule({
      imports: [HlsPlayerComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(HlsPlayerComponent);
  });

  afterEach(() => {
    fixture.destroy();
    vi.restoreAllMocks();
  });

  it('falls back to native HLS when hls.js is unsupported (Safari)', async () => {
    hlsMockState.supported = false;
    vi.spyOn(HTMLMediaElement.prototype, 'canPlayType').mockReturnValue('probably');
    const url = 'https://stream.example/live/manifest/video.m3u8';

    fixture.componentRef.setInput('src', url);
    await fixture.whenStable();

    const video = fixture.nativeElement.querySelector('video') as HTMLVideoElement;
    await vi.waitFor(() => expect(video.getAttribute('src')).toBe(url));
    expect(hlsMockState.instances).toHaveLength(0);

    video.dispatchEvent(new Event('canplay'));
    expect(fixture.componentInstance.status()).toBe('ready');
  });

  it('prefers hls.js over native playback even when canPlayType reports support', async () => {
    vi.spyOn(HTMLMediaElement.prototype, 'canPlayType').mockReturnValue('maybe');
    const url = 'https://stream.example/live/manifest/video.m3u8';

    fixture.componentRef.setInput('src', url);
    await fixture.whenStable();
    await vi.waitFor(() => expect(hlsMockState.instances).toHaveLength(1));

    const video = fixture.nativeElement.querySelector('video') as HTMLVideoElement;
    const hls = latestHlsInstance();
    expect(hls.attachMedia).toHaveBeenCalledWith(video);

    emitHls(hls, 'media-attached');
    expect(hls.loadSource).toHaveBeenCalledWith(url);

    emitHls(hls, 'manifest-parsed');
    expect(fixture.componentInstance.status()).toBe('ready');
  });

  it('destroys playback and removes listeners when src becomes null', async () => {
    vi.spyOn(HTMLMediaElement.prototype, 'canPlayType').mockReturnValue('');
    fixture.componentRef.setInput('src', 'https://stream.example/first.m3u8');
    await fixture.whenStable();
    await vi.waitFor(() => expect(hlsMockState.instances).toHaveLength(1));
    const oldVideo = fixture.nativeElement.querySelector('video') as HTMLVideoElement;
    const hls = latestHlsInstance();

    fixture.componentRef.setInput('src', null);
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('video')).toBeNull();
    expect(hls.destroy).toHaveBeenCalledOnce();
    expect(oldVideo.hasAttribute('src')).toBe(false);
    expect(loadSpy).toHaveBeenCalled();
    expect(fixture.componentInstance.status()).toBe('loading');
  });

  it('ignores callbacks belonging to a replaced source', async () => {
    vi.spyOn(HTMLMediaElement.prototype, 'canPlayType').mockReturnValue('');
    fixture.componentRef.setInput('src', 'https://stream.example/first.m3u8');
    await fixture.whenStable();
    await vi.waitFor(() => expect(hlsMockState.instances).toHaveLength(1));
    const firstHls = latestHlsInstance();

    fixture.componentRef.setInput('src', 'https://stream.example/second.m3u8');
    await fixture.whenStable();
    await vi.waitFor(() => expect(hlsMockState.instances).toHaveLength(2));

    emitHls(firstHls, 'manifest-parsed');

    expect(firstHls.destroy).toHaveBeenCalledOnce();
    expect(fixture.componentInstance.status()).toBe('loading');
  });

  it('recovers a fatal hls.js media error', async () => {
    vi.spyOn(HTMLMediaElement.prototype, 'canPlayType').mockReturnValue('');
    fixture.componentRef.setInput('src', 'https://stream.example/live.m3u8');
    await fixture.whenStable();
    await vi.waitFor(() => expect(hlsMockState.instances).toHaveLength(1));
    const hls = latestHlsInstance();

    emitHls(hls, 'error', undefined, {
      fatal: true,
      type: 'mediaError',
      details: 'bufferAppendError',
    });

    expect(fixture.componentInstance.status()).toBe('reconnecting');
    expect(hls.recoverMediaError).toHaveBeenCalledOnce();
  });

  it('requests a playback refresh once for repeated network errors', async () => {
    vi.spyOn(HTMLMediaElement.prototype, 'canPlayType').mockReturnValue('');
    fixture.componentRef.setInput('src', 'https://stream.example/live.m3u8');
    await fixture.whenStable();
    await vi.waitFor(() => expect(hlsMockState.instances).toHaveLength(1));
    const hls = latestHlsInstance();
    const refreshSpy = vi.spyOn(fixture.componentInstance.playbackRefreshRequested, 'emit');
    const networkError = {
      fatal: true,
      type: 'networkError',
      details: 'manifestLoadError',
    };

    emitHls(hls, 'error', undefined, networkError);
    emitHls(hls, 'error', undefined, networkError);

    expect(refreshSpy).toHaveBeenCalledOnce();
  });
});
