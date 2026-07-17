import { Module, Global } from '@nestjs/common';
import { EventStateTransitionRepository } from './event-state-transition.repository';
import { EventStateMachineService } from './event-state-machine.service';

@Global()
@Module({
  providers: [EventStateTransitionRepository, EventStateMachineService],
  exports: [EventStateTransitionRepository, EventStateMachineService],
})
export class EventStateDomainModule {}
