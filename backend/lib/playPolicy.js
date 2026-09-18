const { publicOrigin, legalPayload } = require('./ugcPolicy')
const { EVENTS } = require('./observability')

const PACKAGE_ID = 'pt.partymix.app'
const WRAPPER = 'twa'
const AGE_RATING = '18+'
const PLAY_CATEGORY = 'GAME_CASUAL'
const MIN_SDK = 21
const SHA256_FP_RE = /^[0-9A-F]{2}(:[0-9A-F]{2}){31}$/i
const PLACEHOLDER_FP_RE = /^00(:00){31}$/i

const ANDROID_PERMISSIONS = []
const TWA_CHROME_PERMISSIONS = ['android.permission.INTERNET']

const COOKIES_COLLECTED = [
  { name: 'pm_age', purpose: 'Declaração de idade 18+ / menor', type: 'personal_info' },
  { name: 'pm_vid', purpose: 'Voto e denúncia anónimos na comunidade', type: 'device_or_other_ids' },
  { name: 'pmx_instance', purpose: 'Sticky da instância WebSocket', type: 'device_or_other_ids' },
  { name: 'pmx_io', purpose: 'Sessão Engine.IO', type: 'device_or_other_ids' },
]

function playPackageId(env = process.env) {
  const raw = String(env.PLAY_PACKAGE_ID || PACKAGE_ID).trim()
  return /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/i.test(raw) ? raw : PACKAGE_ID
}

function playCertFingerprint(env = process.env) {
  const raw = String(env.PLAY_SHA256_CERT || '').trim().toUpperCase()
  if (!SHA256_FP_RE.test(raw)) return ''
  if (PLACEHOLDER_FP_RE.test(raw)) return ''
  return raw
}

function isPlayReady(env = process.env) {
  return Boolean(publicOrigin(env) && playCertFingerprint(env))
}

function playBlockers(env = process.env) {
  const blockers = []
  if (!publicOrigin(env)) blockers.push('PUBLIC_ORIGIN tem de ser HTTPS público')
  if (!playCertFingerprint(env)) blockers.push('PLAY_SHA256_CERT (assinatura Play) em falta')
  return blockers
}

function assetLinksPayload(env = process.env) {
  const fingerprint = playCertFingerprint(env)
  const target = {
    namespace: 'android_app',
    package_name: playPackageId(env),
    sha256_cert_fingerprints: fingerprint ? [fingerprint] : [],
  }
  return [
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target,
    },
  ]
}

function twaManifest(env = process.env) {
  const origin = publicOrigin(env)
  const host = origin ? new URL(origin).host : ''
  const icon = origin ? `${origin}/icon-512.png` : '/icon-512.png'
  return {
    packageId: playPackageId(env),
    host,
    name: 'PartyMix',
    launcherName: 'PartyMix',
    display: 'standalone',
    orientation: 'portrait',
    themeColor: '#6D28D9',
    navigationColor: '#0F172A',
    backgroundColor: '#0F172A',
    startUrl: '/',
    iconUrl: icon,
    maskableIconUrl: icon,
    webManifestUrl: origin ? `${origin}/manifest.json` : '/manifest.json',
    appVersionName: '1.0.0',
    appVersionCode: 1,
    minSdkVersion: MIN_SDK,
    enableNotifications: false,
    isChromeOSOnly: false,
    fallbackType: 'customtabs',
    features: {},
    fingerprints: playCertFingerprint(env) ? [{ name: 'play', value: playCertFingerprint(env) }] : [],
    additionalTrustedOrigins: [],
    generatorApp: 'partymix-play-policy',
  }
}

function listingPt() {
  return {
    defaultLanguage: 'pt-PT',
    title: 'PartyMix',
    shortDescription: 'Jogos de festa 18+ no telemóvel. Família, memes, cartas e Mister White.',
    fullDescription: [
      'PartyMix é um conjunto de jogos de festa para jogar no mesmo sofá ou online.',
      '',
      '18+. Há modos com álcool, linguagem e conteúdo sexual para adultos. Confirmas a idade na app. Menores só usam o Modo Família, sem conteúdo adulto.',
      '',
      'Modos: Beber, Amigos, Família, Casal, Cartas, Mister White, AldeiaMix e MemeMix (fotos do grupo viram memes).',
      '',
      'Conteúdo da comunidade (UGC): podes submeter cartas e fotos. Podes denunciar e bloquear. Um admin revê. Não submetas conteúdo ilegal.',
      '',
      'Sem compras na app. Sem anúncios de terceiros. As salas online vivem na memória do servidor: um reinício pode acabar o jogo.',
      '',
      'Política de privacidade e termos estão na app e no site HTTPS do operador.',
    ].join('\n'),
    category: PLAY_CATEGORY,
    tags: ['festa', 'cartas', 'beber', '18+'],
    contentRating: AGE_RATING,
    inAppPurchases: false,
    ads: false,
    contactWebsitePath: '/',
    privacyPolicyPath: '/privacy',
    termsPath: '/terms',
  }
}

function contentRating() {
  return {
    questionnaire: 'IARC',
    expectedRating: AGE_RATING,
    alcohol: true,
    sexualContent: true,
    strongLanguage: true,
    violence: false,
    gambling: false,
    userGeneratedContent: true,
    usersInteract: true,
    sharesLocation: false,
    inAppPurchases: false,
    designedForChildren: false,
    targetAge: '18+',
    notesPt: 'Álcool e conteúdo sexual em modos adultos. Modo Família existe na app mas a ficha da loja é 18+.',
  }
}

function dataSafety() {
  return {
    collects: true,
    encryptedInTransit: true,
    usersCanRequestDeletion: true,
    sold: false,
    advertised: false,
    advertisingId: false,
    dataTypes: [
      {
        type: 'Personal info — Name',
        collected: true,
        optional: true,
        shared: false,
        purpose: ['App functionality'],
        ephemeral: true,
        note: 'Nome de jogador na sala; não há conta obrigatória',
      },
      {
        type: 'Personal info — Other (age declaration)',
        collected: true,
        optional: false,
        shared: false,
        purpose: ['App functionality'],
        ephemeral: false,
        note: 'Cookie pm_age: 18+ ou menor',
      },
      {
        type: 'Photos and videos — Photos',
        collected: true,
        optional: true,
        shared: false,
        purpose: ['App functionality'],
        ephemeral: true,
        note: 'MemeMix: até 6 horas ou até a sala acabar',
      },
      {
        type: 'App activity — App interactions',
        collected: true,
        optional: false,
        shared: false,
        purpose: ['Analytics'],
        ephemeral: false,
        note: `Eventos técnicos sem PII: ${EVENTS.join(', ')}`,
      },
      {
        type: 'App info and performance — Crash logs',
        collected: true,
        optional: false,
        shared: false,
        purpose: ['Analytics'],
        ephemeral: false,
        note: 'Logs JSON; Sentry só se o operador definir SENTRY_DSN',
      },
      {
        type: 'Device or other IDs',
        collected: true,
        optional: false,
        shared: false,
        purpose: ['App functionality', 'Analytics'],
        ephemeral: false,
        note: 'pm_vid, pmx_instance, pmx_io — não é Advertising ID',
      },
    ],
    thirdParties: [
      { name: 'Groq', when: 'Se a IA estiver ligada', data: 'Nomes e texto do pedido de carta' },
      { name: 'MongoDB Atlas', when: 'Sempre em produção', data: 'Comunidade, lobbies HTTP, denúncias' },
      { name: 'Alojamento (Render/Netlify)', when: 'Sempre', data: 'Logs técnicos com IP' },
    ],
    cookies: COOKIES_COLLECTED,
  }
}

function playPayload(env = process.env) {
  const legal = legalPayload(env)
  const listing = listingPt()
  const origin = legal.publicOrigin
  return {
    wrapper: WRAPPER,
    packageId: playPackageId(env),
    ageRating: AGE_RATING,
    category: PLAY_CATEGORY,
    inAppPurchases: false,
    ads: false,
    advertisingId: false,
    androidPermissions: ANDROID_PERMISSIONS.slice(),
    chromeInternetPermission: TWA_CHROME_PERMISSIONS.slice(),
    minSdkVersion: MIN_SDK,
    ready: isPlayReady(env),
    blockers: playBlockers(env),
    host: origin ? new URL(origin).host : '',
    privacyUrl: origin ? `${origin}${listing.privacyPolicyPath}` : listing.privacyPolicyPath,
    termsUrl: origin ? `${origin}${listing.termsPath}` : listing.termsPath,
    startUrl: '/',
    listing,
    contentRating: contentRating(),
    dataSafety: dataSafety(),
    assetLinks: assetLinksPayload(env),
    twa: twaManifest(env),
  }
}

module.exports = {
  PACKAGE_ID,
  WRAPPER,
  AGE_RATING,
  PLAY_CATEGORY,
  MIN_SDK,
  ANDROID_PERMISSIONS,
  COOKIES_COLLECTED,
  SHA256_FP_RE,
  playPackageId,
  playCertFingerprint,
  isPlayReady,
  playBlockers,
  assetLinksPayload,
  twaManifest,
  listingPt,
  contentRating,
  dataSafety,
  playPayload,
}
