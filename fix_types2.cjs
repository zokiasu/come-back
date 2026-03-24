const fs = require('fs')
let content = fs.readFileSync('c:/Users/pierr/Desktop/project/comeback/app/types/supabase.ts', 'utf8')

// Step 1: remove ALL previously inserted notification/push/follow tables (however mangled)
// Find the first bad table and the Views line
const badMarkers = [
  '\t\t\t\t\t\tnotification_preferences:',
  '\t\t\tnotification_preferences:',
  '\t\t\t\tnotification_preferences:',
  '\t\tnotification_preferences:',
]

let badStart = -1
for (const m of badMarkers) {
  const idx = content.indexOf(m)
  if (idx !== -1) {
    badStart = idx
    console.log('Found bad tables at offset', idx, 'marker:', JSON.stringify(m))
    break
  }
}

if (badStart !== -1) {
  // Find the Views: { that comes after the bad insertion
  const viewsIdx = content.indexOf('\r\n\t\tViews: {', badStart)
  if (viewsIdx === -1) {
    console.error('Could not find Views after bad insertion')
    process.exit(1)
  }
  // Remove everything from badStart-2 (the \r\n before it) to viewsIdx
  content = content.slice(0, badStart - 2) + content.slice(viewsIdx)
  console.log('Removed bad insertion')
}

// Step 2: verify current state
const viewsMarker = '\r\n\t\tViews: {'
const usersClose = '\t\t\t\tRelationships: []\r\n\t\t\t}\r\n\t\t}' + viewsMarker

if (!content.includes(usersClose)) {
  console.error('Target marker not found. Showing context around Views:')
  const idx = content.indexOf(viewsMarker)
  if (idx !== -1) {
    console.log(JSON.stringify(content.slice(idx - 100, idx + 20)))
  }
  process.exit(1)
}

// Step 3: insert new tables correctly at 3-tab level inside Tables{}
const newTablesBlock = [
  '\t\t\tnotification_preferences: {',
  '\t\t\t\tRow: {',
  '\t\t\t\t\tuser_id: string',
  '\t\t\t\t\tpush_enabled: boolean',
  '\t\t\t\t\tdaily_comeback: boolean',
  '\t\t\t\t\tweekly_comeback: boolean',
  '\t\t\t\t\tfollowed_artist_alerts: boolean',
  '\t\t\t\t\tupdated_at: string',
  '\t\t\t\t}',
  '\t\t\t\tInsert: {',
  '\t\t\t\t\tuser_id: string',
  '\t\t\t\t\tpush_enabled?: boolean',
  '\t\t\t\t\tdaily_comeback?: boolean',
  '\t\t\t\t\tweekly_comeback?: boolean',
  '\t\t\t\t\tfollowed_artist_alerts?: boolean',
  '\t\t\t\t\tupdated_at?: string',
  '\t\t\t\t}',
  '\t\t\t\tUpdate: {',
  '\t\t\t\t\tuser_id?: string',
  '\t\t\t\t\tpush_enabled?: boolean',
  '\t\t\t\t\tdaily_comeback?: boolean',
  '\t\t\t\t\tweekly_comeback?: boolean',
  '\t\t\t\t\tfollowed_artist_alerts?: boolean',
  '\t\t\t\t\tupdated_at?: string',
  '\t\t\t\t}',
  "\t\t\t\tRelationships: [",
  "\t\t\t\t\t{",
  "\t\t\t\t\t\tforeignKeyName: 'notification_preferences_user_id_fkey'",
  "\t\t\t\t\t\tcolumns: ['user_id']",
  "\t\t\t\t\t\tisOneToOne: true",
  "\t\t\t\t\t\treferencedRelation: 'users'",
  "\t\t\t\t\t\treferencedColumns: ['id']",
  '\t\t\t\t\t},',
  '\t\t\t\t]',
  '\t\t\t}',
  '\t\t\tpush_subscriptions: {',
  '\t\t\t\tRow: {',
  '\t\t\t\t\tid: string',
  '\t\t\t\t\tuser_id: string',
  '\t\t\t\t\tendpoint: string',
  '\t\t\t\t\tp256dh: string',
  '\t\t\t\t\tauth: string',
  '\t\t\t\t\tuser_agent: string | null',
  '\t\t\t\t\tcreated_at: string',
  '\t\t\t\t}',
  '\t\t\t\tInsert: {',
  '\t\t\t\t\tid?: string',
  '\t\t\t\t\tuser_id: string',
  '\t\t\t\t\tendpoint: string',
  '\t\t\t\t\tp256dh: string',
  '\t\t\t\t\tauth: string',
  '\t\t\t\t\tuser_agent?: string | null',
  '\t\t\t\t\tcreated_at?: string',
  '\t\t\t\t}',
  '\t\t\t\tUpdate: {',
  '\t\t\t\t\tid?: string',
  '\t\t\t\t\tuser_id?: string',
  '\t\t\t\t\tendpoint?: string',
  '\t\t\t\t\tp256dh?: string',
  '\t\t\t\t\tauth?: string',
  '\t\t\t\t\tuser_agent?: string | null',
  '\t\t\t\t\tcreated_at?: string',
  '\t\t\t\t}',
  '\t\t\t\tRelationships: [',
  '\t\t\t\t\t{',
  "\t\t\t\t\t\tforeignKeyName: 'push_subscriptions_user_id_fkey'",
  "\t\t\t\t\t\tcolumns: ['user_id']",
  '\t\t\t\t\t\tisOneToOne: false',
  "\t\t\t\t\t\treferencedRelation: 'users'",
  "\t\t\t\t\t\treferencedColumns: ['id']",
  '\t\t\t\t\t},',
  '\t\t\t\t]',
  '\t\t\t}',
  '\t\t\tuser_followed_artists: {',
  '\t\t\t\tRow: {',
  '\t\t\t\t\tuser_id: string',
  '\t\t\t\t\tartist_id: string',
  '\t\t\t\t\tcreated_at: string',
  '\t\t\t\t}',
  '\t\t\t\tInsert: {',
  '\t\t\t\t\tuser_id: string',
  '\t\t\t\t\tartist_id: string',
  '\t\t\t\t\tcreated_at?: string',
  '\t\t\t\t}',
  '\t\t\t\tUpdate: {',
  '\t\t\t\t\tuser_id?: string',
  '\t\t\t\t\tartist_id?: string',
  '\t\t\t\t\tcreated_at?: string',
  '\t\t\t\t}',
  '\t\t\t\tRelationships: [',
  '\t\t\t\t\t{',
  "\t\t\t\t\t\tforeignKeyName: 'user_followed_artists_user_id_fkey'",
  "\t\t\t\t\t\tcolumns: ['user_id']",
  '\t\t\t\t\t\tisOneToOne: false',
  "\t\t\t\t\t\treferencedRelation: 'users'",
  "\t\t\t\t\t\treferencedColumns: ['id']",
  '\t\t\t\t\t},',
  '\t\t\t\t\t{',
  "\t\t\t\t\t\tforeignKeyName: 'user_followed_artists_artist_id_fkey'",
  "\t\t\t\t\t\tcolumns: ['artist_id']",
  '\t\t\t\t\t\tisOneToOne: false',
  "\t\t\t\t\t\treferencedRelation: 'artists'",
  "\t\t\t\t\t\treferencedColumns: ['id']",
  '\t\t\t\t\t},',
  '\t\t\t\t]',
  '\t\t\t}',
].join('\r\n')

const insertionPoint = '\t\t\t\tRelationships: []\r\n\t\t\t}\r\n\t\t}'
const replacement = insertionPoint + '\r\n' + newTablesBlock

content = content.replace(insertionPoint + viewsMarker, replacement + viewsMarker)

if (!content.includes('notification_preferences')) {
  console.error('Insertion failed - notification_preferences not found')
  process.exit(1)
}

fs.writeFileSync('c:/Users/pierr/Desktop/project/comeback/app/types/supabase.ts', content, 'utf8')
console.log('SUCCESS')
