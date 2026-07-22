import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtPayload } from '@zentic/shared-types';
import { TributeBookService } from './tribute-book.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ListTributeMessagesQueryDto } from './dto/list-tribute-messages-query.dto';
import { MessageOriginDto } from './dto/message-origin.dto';
import { RejectMessageDto } from './dto/reject-message.dto';
import { BulkApproveMessagesDto } from './dto/bulk-approve-messages.dto';
import { GenerateTributeBookDto } from './dto/generate-tribute-book.dto';

@ApiTags('tribute-book')
@ApiBearerAuth()
@Controller('tribute-book')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionGuard)
export class TributeBookController {
  constructor(private readonly tributeBookService: TributeBookService) {}

  @Get('messages')
  @RequirePermission('messages:read')
  listMessages(
    @TenantId() tenantId: string,
    @Query() query: ListTributeMessagesQueryDto,
  ) {
    return this.tributeBookService.listMessages(tenantId, query);
  }

  @Get('messages/pending-count')
  @RequirePermission('messages:read')
  async pendingCount(@TenantId() tenantId: string) {
    const count = await this.tributeBookService.pendingCount(tenantId);
    return { count };
  }

  @Patch('messages/:id/approve')
  @RequirePermission('messages:approve')
  approveMessage(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: MessageOriginDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.tributeBookService.approveMessage(
      tenantId,
      id,
      dto.origin,
      user.sub,
    );
  }

  @Patch('messages/:id/reject')
  @RequirePermission('messages:approve')
  rejectMessage(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: RejectMessageDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.tributeBookService.rejectMessage(
      tenantId,
      id,
      dto.origin,
      user.sub,
      dto.rejectedReason,
    );
  }

  @Post('messages/bulk-approve')
  @RequirePermission('messages:approve')
  bulkApprove(
    @TenantId() tenantId: string,
    @Body() dto: BulkApproveMessagesDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.tributeBookService.bulkApprove(tenantId, dto, user.sub);
  }

  @Delete('messages/:id')
  @RequirePermission('messages:delete')
  softDelete(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Query() query: MessageOriginDto,
  ) {
    return this.tributeBookService.softDelete(tenantId, id, query.origin);
  }

  @Post('messages/:id/restore')
  @RequirePermission('messages:delete')
  restore(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Query() query: MessageOriginDto,
  ) {
    return this.tributeBookService.restore(tenantId, id, query.origin);
  }

  @Post('generate')
  @RequirePermission('messages:export')
  generate(
    @TenantId() tenantId: string,
    @Body() dto: GenerateTributeBookDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.tributeBookService.generate(tenantId, dto, user.sub);
  }

  @Get('history')
  @RequirePermission('messages:export')
  getHistory(
    @TenantId() tenantId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.tributeBookService.getHistory(
      tenantId,
      page ? Number(page) : undefined,
      limit ? Number(limit) : undefined,
    );
  }

  @Get(':generationId/download')
  @RequirePermission('messages:export')
  async download(
    @TenantId() tenantId: string,
    @Param('generationId') generationId: string,
    @Res() res: Response,
  ) {
    const { buffer, filename } = await this.tributeBookService.download(
      tenantId,
      generationId,
    );
    res.header('Content-Type', 'application/pdf');
    res.header('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }
}
