import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { VenuesService } from './venues.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { CreateVenueDto } from './dto/create-venue.dto';
import { UpdateVenueDto } from './dto/update-venue.dto';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';

@ApiTags('admin/venues')
@ApiBearerAuth()
@Controller('admin/venues')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionGuard)
export class VenuesController {
  constructor(private readonly venuesService: VenuesService) {}

  @Get()
  @RequirePermission('venues:read')
  list(@TenantId() tenantId: string) {
    return this.venuesService.list(tenantId);
  }

  @Post()
  @RequirePermission('venues:manage')
  create(@TenantId() tenantId: string, @Body() dto: CreateVenueDto) {
    return this.venuesService.create(tenantId, dto);
  }

  @Patch(':id')
  @RequirePermission('venues:manage')
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateVenueDto,
  ) {
    return this.venuesService.update(tenantId, id, dto);
  }

  @Delete(':id')
  @RequirePermission('venues:manage')
  remove(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.venuesService.remove(tenantId, id);
  }

  @Post(':venueId/rooms')
  @RequirePermission('venues:manage')
  addRoom(
    @TenantId() tenantId: string,
    @Param('venueId') venueId: string,
    @Body() dto: CreateRoomDto,
  ) {
    return this.venuesService.addRoom(tenantId, venueId, dto);
  }

  @Patch(':venueId/rooms/:roomId')
  @RequirePermission('venues:manage')
  updateRoom(
    @TenantId() tenantId: string,
    @Param('venueId') venueId: string,
    @Param('roomId') roomId: string,
    @Body() dto: UpdateRoomDto,
  ) {
    return this.venuesService.updateRoom(tenantId, venueId, roomId, dto);
  }

  @Delete(':venueId/rooms/:roomId')
  @RequirePermission('venues:manage')
  removeRoom(
    @TenantId() tenantId: string,
    @Param('venueId') venueId: string,
    @Param('roomId') roomId: string,
  ) {
    return this.venuesService.removeRoom(tenantId, venueId, roomId);
  }
}
