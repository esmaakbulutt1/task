import { Transform } from 'class-transformer';
import { IsIn } from 'class-validator';

export class UpdateWorkspaceMemberDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsIn(['admin', 'member'])
  role!: 'admin' | 'member';
}
