const sharpChain = {
  png: jest.fn(),
  toBuffer: jest.fn(),
};
const sharpMock = jest.fn(() => sharpChain);

jest.mock('sharp', () => sharpMock);

import { InvitationTemplate } from '@zentic/shared-types';
import {
  INVITATION_CHAT_SIZE,
  INVITATION_SOCIAL_SIZE,
  InvitationImageService,
} from './invitation-image.service';
import { InvitationTemplateFactory } from '../factories/invitation-template.factory';
import { FilesService } from '../../files/files.service';
import { InvitationRenderContext } from '../renderers/invitation-template-renderer.interface';

describe('InvitationImageService', () => {
  let templateFactory: jest.Mocked<InvitationTemplateFactory>;
  let filesService: jest.Mocked<FilesService>;
  let service: InvitationImageService;

  const context: InvitationRenderContext = {
    deceasedFullName: 'María López',
    deceasedPhotoDataUri: null,
    message: null,
    scheduledAt: new Date('2026-07-05T19:00:00.000Z'),
    ceremonyType: 'VELATORIO',
    place: null,
    accessCodeDisplay: null,
    tenantName: 'Funeraria XYZ',
    tenantLogoDataUri: null,
    brand: {
      primaryColor: '#1a1a2e',
      secondaryColor: '#16213e',
      textColor: '#333333',
      backgroundColor: '#f5f5f5',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    sharpChain.png.mockReturnValue(sharpChain);
    sharpChain.toBuffer.mockResolvedValue(Buffer.from('png-bytes'));
    sharpMock.mockReturnValue(sharpChain);

    templateFactory = {
      create: jest.fn().mockReturnValue({
        renderSvg: jest.fn().mockReturnValue('<svg></svg>'),
      }),
    } as unknown as jest.Mocked<InvitationTemplateFactory>;

    filesService = {
      readLocalFile: jest.fn(),
    } as unknown as jest.Mocked<FilesService>;

    service = new InvitationImageService(templateFactory, filesService);
  });

  describe('renderSocial', () => {
    it('rasterizes the SVG built by the template renderer at 1080x1080', async () => {
      const buffer = await service.renderSocial(
        InvitationTemplate.CLASSIC,
        context,
      );

      expect(templateFactory.create).toHaveBeenCalledWith(
        InvitationTemplate.CLASSIC,
      );
      const renderer = templateFactory.create.mock.results[0].value;
      expect(renderer.renderSvg).toHaveBeenCalledWith(
        context,
        INVITATION_SOCIAL_SIZE,
      );
      expect(sharpChain.png).toHaveBeenCalledWith({ quality: 90 });
      expect(buffer).toEqual(Buffer.from('png-bytes'));
    });
  });

  describe('renderChatPreview', () => {
    it('rasterizes the SVG at 1200x630', async () => {
      await service.renderChatPreview(InvitationTemplate.MODERN, context);

      const renderer = templateFactory.create.mock.results[0].value;
      expect(renderer.renderSvg).toHaveBeenCalledWith(
        context,
        INVITATION_CHAT_SIZE,
      );
    });
  });

  describe('toDataUri', () => {
    it('returns null when the fileUrl is null', async () => {
      expect(await service.toDataUri(null)).toBeNull();
      expect(filesService.readLocalFile).not.toHaveBeenCalled();
    });

    it('returns null when the file cannot be read (e.g. deleted from disk)', async () => {
      filesService.readLocalFile.mockResolvedValue(null);

      expect(
        await service.toDataUri('http://localhost:3000/uploads/x/photo.png'),
      ).toBeNull();
    });

    it('encodes the file as a base64 data URI with the mimetype inferred from the extension', async () => {
      filesService.readLocalFile.mockResolvedValue(Buffer.from('img-bytes'));

      const result = await service.toDataUri(
        'http://localhost:3000/uploads/deceased/tenant-1/photo.webp',
      );

      expect(result).toBe(
        `data:image/webp;base64,${Buffer.from('img-bytes').toString('base64')}`,
      );
    });
  });
});
