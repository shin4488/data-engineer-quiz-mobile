// 試験ガイドの5分野。名称は Google Cloud の認定資格ページ（日本語）の表記に合わせる。
export const DOMAINS = [
  { id: 'design', label: 'データ処理システムの設計', short: '設計' },
  { id: 'ingest', label: 'データの取り込みと処理', short: '取り込み・処理' },
  { id: 'store', label: 'データの保存', short: '保存' },
  { id: 'analyze', label: '分析用データを準備して使用する', short: '分析' },
  { id: 'maintain', label: 'データ ワークロードの維持と自動化', short: '維持・自動化' },
] as const;

export type DomainId = (typeof DOMAINS)[number]['id'];

export const SERVICES = [
  { id: 'bigquery', label: 'BigQuery' },
  { id: 'bigquery-ml', label: 'BigQuery ML' },
  { id: 'dataflow', label: 'Dataflow' },
  { id: 'pubsub', label: 'Pub/Sub' },
  { id: 'dataproc', label: 'Dataproc' },
  { id: 'data-fusion', label: 'Cloud Data Fusion' },
  { id: 'kafka', label: 'Apache Kafka' },
  { id: 'datastream', label: 'Datastream' },
  { id: 'composer', label: 'Cloud Composer' },
  { id: 'workflows', label: 'Workflows' },
  { id: 'dataform', label: 'Dataform' },
  { id: 'cloud-storage', label: 'Cloud Storage' },
  { id: 'bigtable', label: 'Bigtable' },
  { id: 'spanner', label: 'Spanner' },
  { id: 'cloud-sql', label: 'Cloud SQL' },
  { id: 'alloydb', label: 'AlloyDB' },
  { id: 'firestore', label: 'Firestore' },
  { id: 'memorystore', label: 'Memorystore' },
  { id: 'biglake', label: 'BigLake' },
  { id: 'dataplex', label: 'Dataplex' },
  { id: 'analytics-hub', label: 'Analytics Hub' },
  { id: 'looker', label: 'Looker / Looker Studio' },
  { id: 'vertex-ai', label: 'Vertex AI' },
  { id: 'migration', label: '移行・転送サービス' },
  { id: 'iam', label: 'IAM' },
  { id: 'kms', label: '暗号化・鍵管理' },
  { id: 'dlp', label: 'Sensitive Data Protection' },
  { id: 'vpc-sc', label: 'VPC Service Controls' },
  { id: 'networking', label: 'ネットワーク' },
  { id: 'monitoring', label: 'Monitoring / Logging' },
] as const;

export type ServiceId = (typeof SERVICES)[number]['id'];

export const DOMAIN_IDS: readonly string[] = DOMAINS.map((d) => d.id);
export const SERVICE_IDS: readonly string[] = SERVICES.map((s) => s.id);

const DOMAIN_BY_ID = new Map<string, (typeof DOMAINS)[number]>(DOMAINS.map((d) => [d.id, d]));
const SERVICE_BY_ID = new Map<string, (typeof SERVICES)[number]>(SERVICES.map((s) => [s.id, s]));

export const domainOf = (id: DomainId) => DOMAIN_BY_ID.get(id) as (typeof DOMAINS)[number];
export const serviceLabel = (id: ServiceId) => SERVICE_BY_ID.get(id)?.label ?? id;
