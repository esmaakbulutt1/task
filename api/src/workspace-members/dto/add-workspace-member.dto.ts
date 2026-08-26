import { Transform } from 'class-transformer';
import { IsEmail, IsIn } from 'class-validator';

export class AddWorkspaceMemberDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  email!: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsIn(['admin', 'member'])
  role!: 'admin' | 'member';
}
