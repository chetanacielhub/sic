import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Read .env.local manually
try {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx > 0) {
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim();
        process.env[key] = val;
      }
    }
  }
} catch (e) {
  console.warn('Could not read .env.local:', e);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function provisionUsers() {
  console.log('Fetching members from public.members...');
  const { data: members, error: memErr } = await supabase
    .from('members')
    .select('id, full_name, email, org_role');

  if (memErr || !members) {
    console.error('Failed to fetch members:', memErr);
    process.exit(1);
  }

  console.log(`Found ${members.length} members.`);

  // List existing auth users
  const { data: { users: existingUsers } } = await supabase.auth.admin.listUsers();
  const emailMap = new Map((existingUsers || []).map(u => [u.email?.toLowerCase(), u]));

  const defaultPassword = 'DemoPassword2027!';

  for (const m of members) {
    const email = m.email.toLowerCase();
    let authUserId: string;

    if (emailMap.has(email)) {
      const existing = emailMap.get(email)!;
      authUserId = existing.id;
      console.log(`User ${email} already exists in auth.users (${authUserId}). Updating password...`);
      await supabase.auth.admin.updateUserById(authUserId, {
        password: defaultPassword,
        email_confirm: true,
        user_metadata: {
          full_name: m.full_name,
          member_id: m.id,
          org_role: m.org_role,
        },
      });
    } else {
      console.log(`Creating user for ${email} in auth.users...`);
      const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
        email,
        password: defaultPassword,
        email_confirm: true,
        user_metadata: {
          full_name: m.full_name,
          member_id: m.id,
          org_role: m.org_role,
        },
      });

      if (createErr || !newUser.user) {
        console.error(`Failed to create auth user for ${email}:`, createErr?.message);
        continue;
      }
      authUserId = newUser.user.id;
    }

    // Link auth_user_id to member record
    const { error: linkErr } = await supabase
      .from('members')
      .update({ auth_user_id: authUserId })
      .eq('id', m.id);

    if (linkErr) {
      console.warn(`Failed to link auth_user_id for ${m.full_name}:`, linkErr.message);
    } else {
      console.log(`Successfully linked ${m.full_name} (${email}) -> ${authUserId}`);
    }
  }

  console.log('\n--- Provisioning complete! ---');
  console.log(`All ${members.length} accounts can now log in using password: ${defaultPassword}`);
}

provisionUsers().catch(console.error);
