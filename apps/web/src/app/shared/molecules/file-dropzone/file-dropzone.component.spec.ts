import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { FileDropzoneComponent } from './file-dropzone.component';

function makeFile(name: string, type: string, sizeBytes: number): File {
  const blob = new Blob([new Uint8Array(sizeBytes)], { type });
  return new File([blob], name, { type });
}

describe('FileDropzoneComponent', () => {
  function createFixture() {
    TestBed.configureTestingModule({ imports: [FileDropzoneComponent] });
    const fixture = TestBed.createComponent(FileDropzoneComponent);
    fixture.componentInstance.maxSizeBytes = 2 * 1024 * 1024;
    fixture.detectChanges();
    return fixture;
  }

  it('rejects an unsupported mimetype and does not emit', () => {
    const fixture = createFixture();
    const emitSpy = vi.spyOn(fixture.componentInstance.fileSelected, 'emit');
    const file = makeFile('logo.bmp', 'image/bmp', 100);

    fixture.componentInstance.onFileInputChange({ target: { files: [file] } } as unknown as Event);

    expect(fixture.componentInstance.error()).toBe('Formato no soportado. Use PNG, JPG o SVG');
    expect(emitSpy).not.toHaveBeenCalled();
  });

  it('rejects a file exceeding maxSizeBytes and does not emit', () => {
    const fixture = createFixture();
    const emitSpy = vi.spyOn(fixture.componentInstance.fileSelected, 'emit');
    const file = makeFile('logo.png', 'image/png', 3 * 1024 * 1024);

    fixture.componentInstance.onFileInputChange({ target: { files: [file] } } as unknown as Event);

    expect(fixture.componentInstance.error()).toBe('El archivo excede el máximo de 2MB');
    expect(emitSpy).not.toHaveBeenCalled();
  });

  it('emits fileSelected for a valid file', () => {
    const fixture = createFixture();
    const emitSpy = vi.spyOn(fixture.componentInstance.fileSelected, 'emit');
    const file = makeFile('logo.png', 'image/png', 1024);

    fixture.componentInstance.onFileInputChange({ target: { files: [file] } } as unknown as Event);

    expect(fixture.componentInstance.error()).toBe('');
    expect(emitSpy).toHaveBeenCalledWith(file);
  });
});
