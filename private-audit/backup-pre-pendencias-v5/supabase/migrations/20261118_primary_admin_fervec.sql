-- FerveC Gastronomia — Alteração Definitiva da Conta Administrativa Principal (Idempotente)
-- Nova conta administrativa oficial: fervecrgastronomia@gmail.com
-- CPF (armazenado apenas mascarado + SHA-256) e Data de nascimento: 09/11/2000
-- Conta anterior com permissões revogadas (dados preservados): gabrielcremonesee@gmail.com

do $$
declare
  v_new_admin_id uuid;
begin
  -- 1) Revogar permissões administrativas das contas anteriores sem excluir usuários ou dados
  update auth.users
     set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
       - 'role'
       - 'fervec_developer'
       - 'certificate_bypass'
       - 'permissions'
   where lower(email) in ('gabrielcremonesee@gmail.com', 'vaquinhavaq@gmail.com');

  -- 2) Configurar função administrativa e vincular perfil oficial se a nova conta já existir em auth.users
  select id
    into v_new_admin_id
    from auth.users
   where lower(email) = 'fervecrgastronomia@gmail.com'
   limit 1;

  if v_new_admin_id is not null then
    update auth.users
       set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) ||
         jsonb_build_object(
           'role', 'developer_admin',
           'fervec_developer', true,
           'certificate_bypass', true,
           'permissions', jsonb_build_array('certificate:bypass_exam', 'admin:asaas_audit')
         )
     where id = v_new_admin_id;

    insert into public.profiles (
      id,
      full_name,
      cpf_masked,
      cpf_hash,
      birth_date,
      age,
      email,
      ddd,
      phone,
      whatsapp_opt_in,
      email_opt_in,
      updated_at
    )
    values (
      v_new_admin_id,
      'FerveC Gastronomia (Admin)',
      '***.722.209-**',
      '14be35054df0cc5de11bc8a02374f8efc4f49aa6d273cce14c1404ce386f71cc',
      '09/11/2000',
      26,
      'fervecrgastronomia@gmail.com',
      '11',
      '90000-0000',
      false,
      false,
      now()
    )
    on conflict (id) do update
      set email = 'fervecrgastronomia@gmail.com',
          cpf_masked = '***.722.209-**',
          cpf_hash = '14be35054df0cc5de11bc8a02374f8efc4f49aa6d273cce14c1404ce386f71cc',
          birth_date = '09/11/2000',
          age = 26,
          updated_at = now();
  end if;
end $$;
