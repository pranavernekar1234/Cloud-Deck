'use strict';
/**
 * seed.js — Initial data seeder
 *
 * Verified technical accuracy:
 *   Q10: S3 CRR + DynamoDB Global Tables — both replicate across regions ✓
 *   Q30: Standard Reserved Instances — largest 75% discount ✓
 *   Glacier: Most cost-effective for 10-year medical record archival ✓
 */

const { User, ExamSet, Question } = require('./models');

const SEED_QUESTIONS = [
  // ── Q1: Glacier / Long-term archival ──────────────────────────────────────
  {
    questionNumber: 'Q1',
    questionText: 'Q1) A hospital needs to store medical records for 10 years for compliance. Access will be extremely rare — perhaps once a decade. Which storage solution is the MOST cost-effective?',
    options: [
      { text: 'Amazon S3 Standard', correct: false },
      { text: 'Amazon S3 Intelligent-Tiering', correct: false },
      { text: 'Amazon S3 Glacier Deep Archive', correct: true },
      { text: 'Amazon EFS (Elastic File System)', correct: false },
    ],
    explanation: 'Amazon S3 Glacier Deep Archive is the most cost-effective storage option for long-term archival of medical records (~$0.00099/GB/month). It is specifically designed for data that is rarely accessed — retained for 7–10 years or longer. Retrieval time is 12–48 hours, which is acceptable for compliance archives accessed perhaps once per decade. S3 Standard costs roughly 23× more per GB and is optimised for frequent access.',
    chooseTwo: false, correctCount: 1, order: 0,
  },
  // ── Q2: Serverless economics ──────────────────────────────────────────────
  {
    questionNumber: 'Q2',
    questionText: 'Q2) A startup runs a web API with highly variable traffic — busy during business hours, near-zero at night. Which AWS compute model eliminates idle costs entirely?',
    options: [
      { text: 'Amazon EC2 On-Demand Instances', correct: false },
      { text: 'AWS Lambda (Serverless)', correct: true },
      { text: 'Amazon EC2 Reserved Instances', correct: false },
      { text: 'Amazon EC2 Dedicated Hosts', correct: false },
    ],
    explanation: 'AWS Lambda is a serverless compute service — code runs only when needed, triggered by events. You pay only for the number of requests and actual execution time (per millisecond). There is zero charge during idle periods. This is why serverless architectures are more economical for variable workloads: eliminating the need to run and pay for EC2 instances that sit idle overnight.',
    chooseTwo: false, correctCount: 1, order: 1,
  },
  // ── Q3: Shared Responsibility ─────────────────────────────────────────────
  {
    questionNumber: 'Q3',
    questionText: "Q3) Under the AWS Shared Responsibility Model, which of the following is the CUSTOMER's responsibility?",
    options: [
      { text: 'Patching the hypervisor software', correct: false },
      { text: 'Physical security of AWS data centres', correct: false },
      { text: 'Configuring IAM policies and encrypting customer data', correct: true },
      { text: 'Maintaining network hardware and cabling', correct: false },
    ],
    explanation: "The Shared Responsibility Model separates: AWS manages 'Security OF the Cloud' (physical infrastructure, hypervisors, networking hardware). Customers manage 'Security IN the Cloud': IAM user/role configuration, data encryption, OS patching on EC2, and application security. Customers retain full control and responsibility for their data and identity configuration.",
    chooseTwo: false, correctCount: 1, order: 2,
  },
  // ── Q4: Choose Two — RDS HA ───────────────────────────────────────────────
  {
    questionNumber: 'Q4',
    questionText: 'Q4) A solutions architect must ensure a database remains available if an Availability Zone fails. Which TWO Amazon RDS features provide this resilience? (Choose TWO.)',
    options: [
      { text: 'Multi-AZ deployment with synchronous standby', correct: true },
      { text: 'Provisioned IOPS (io1) storage', correct: false },
      { text: 'Cross-Region Read Replicas for disaster recovery', correct: true },
      { text: 'Performance Insights monitoring', correct: false },
    ],
    explanation: 'Multi-AZ deployment maintains a synchronous standby replica in a different AZ. Upon primary failure, RDS automatically fails over within 60–120 seconds — no manual intervention needed. Cross-Region Read Replicas protect against full-region failures, enabling manual promotion for DR. IOPS improves performance; Performance Insights provides monitoring — neither contributes to AZ-level HA.',
    chooseTwo: true, correctCount: 2, order: 3,
  },
  // ── Q5: CloudFront CDN ────────────────────────────────────────────────────
  {
    questionNumber: 'Q5',
    questionText: 'Q5) A global e-commerce platform wants to reduce latency for static assets (images, CSS, JS) delivered to users worldwide. Which AWS service should they use?',
    options: [
      { text: 'AWS Direct Connect', correct: false },
      { text: 'Amazon CloudFront', correct: true },
      { text: 'Amazon Route 53 with latency routing', correct: false },
      { text: 'Multiple EC2 instances in each region', correct: false },
    ],
    explanation: "Amazon CloudFront is a Content Delivery Network (CDN) with 400+ edge locations worldwide. Static assets cached at the nearest edge location are served with significantly lower latency than from the origin. This model 'eliminates the need to run and maintain physical data centres' for content distribution. CloudFront integrates natively with S3, EC2, and API Gateway.",
    chooseTwo: false, correctCount: 1, order: 4,
  },
  // ── Q10: Choose Two — Cross-region replication ────────────────────────────
  {
    questionNumber: 'Q10',
    questionText: 'Q10) Which TWO AWS services support automatic data replication across multiple AWS Regions to provide a globally resilient data tier? (Choose TWO.)',
    options: [
      { text: 'Amazon S3 with Cross-Region Replication (CRR)', correct: true },
      { text: 'Amazon EBS with Snapshots', correct: false },
      { text: 'Amazon DynamoDB Global Tables', correct: true },
      { text: 'Amazon ElastiCache for Memcached', correct: false },
    ],
    explanation: "Amazon S3 Cross-Region Replication (CRR) automatically copies objects to a bucket in a different region — providing geographic redundancy for object storage. Amazon DynamoDB Global Tables deliver fully managed, multi-region, multi-active replication with sub-second latency for global read/write access. EBS snapshots are regional resources; ElastiCache Memcached has no native cross-region replication.",
    chooseTwo: true, correctCount: 2, order: 5,
  },
  // ── Q19: Choose Two — Spot / cost ─────────────────────────────────────────
  {
    questionNumber: 'Q19',
    questionText: 'Q19) A data science team runs fault-tolerant batch jobs that can withstand interruptions. Which TWO EC2 purchasing options minimise cost for this workload? (Choose TWO.)',
    options: [
      { text: 'EC2 Spot Instances', correct: true },
      { text: 'EC2 Dedicated Hosts', correct: false },
      { text: 'EC2 Spot Fleet with diversified allocation strategy', correct: true },
      { text: 'EC2 Standard Reserved Instances', correct: false },
    ],
    explanation: 'EC2 Spot Instances offer up to 90% savings vs On-Demand — AWS reclaims them with a 2-minute warning, making them ideal for fault-tolerant batch workloads. A Spot Fleet with diversified allocation spreads requests across instance types and AZs, maximising availability while maintaining Spot pricing. Dedicated Hosts are the most expensive option; Reserved Instances require an upfront commitment unsuitable for variable batch work.',
    chooseTwo: true, correctCount: 2, order: 6,
  },
  // ── Q30: Reserved Instances largest discount ──────────────────────────────
  {
    questionNumber: 'Q30',
    questionText: 'Q30) Which EC2 pricing model provides the LARGEST discount (up to 75%) compared to On-Demand pricing, in exchange for a commitment to a specific instance type, region, and tenancy for 1 or 3 years?',
    options: [
      { text: 'EC2 Spot Instances', correct: false },
      { text: 'EC2 Savings Plans (Compute)', correct: false },
      { text: 'EC2 Standard Reserved Instances', correct: true },
      { text: 'EC2 On-Demand Capacity Reservations', correct: false },
    ],
    explanation: 'Standard Reserved Instances provide up to 75% discount compared to On-Demand pricing — the largest available discount for EC2. This comes in exchange for a 1- or 3-year commitment to a specific instance type, operating system, tenancy, and region. Spot Instances can be cheaper (up to 90%) but may be interrupted. Compute Savings Plans offer flexibility across instance families at slightly lower discounts (~66%). Standard RIs sacrifice flexibility for maximum predictable savings on steady-state workloads.',
    chooseTwo: false, correctCount: 1, order: 7,
  },
  // ── Q42: Choose Two — Root account security ───────────────────────────────
  {
    questionNumber: 'Q42',
    questionText: 'Q42) Which TWO actions does AWS strongly recommend to secure the AWS root account? (Choose TWO.)',
    options: [
      { text: 'Enable Multi-Factor Authentication (MFA) on the root account', correct: true },
      { text: 'Use the root account for all daily administrative tasks', correct: false },
      { text: 'Delete root access keys or never create them', correct: true },
      { text: 'Share root credentials with trusted administrators', correct: false },
    ],
    explanation: 'AWS security best practices — part of the "strong identity foundation" design principle — mandate: (1) Enable MFA on the root account immediately after account creation; even if a password is stolen, MFA prevents access. (2) Remove or never create root access keys — use IAM roles with least-privilege policies for programmatic access instead. Root should only be used for the small set of tasks that explicitly require it (e.g., changing account settings).',
    chooseTwo: true, correctCount: 2, order: 8,
  },
  // ── Q52: Choose Two — VPC security ───────────────────────────────────────
  {
    questionNumber: 'Q52',
    questionText: 'Q52) A three-tier web application requires network isolation between its web, application, and database layers. Which TWO AWS networking features enforce this isolation? (Choose TWO.)',
    options: [
      { text: 'Amazon VPC with public and private subnet separation', correct: true },
      { text: 'AWS Direct Connect for all external traffic', correct: false },
      { text: 'Security Groups acting as virtual stateful firewalls per instance', correct: true },
      { text: 'Amazon Route 53 with health-check routing', correct: false },
    ],
    explanation: 'A VPC with public/private subnets isolates tiers: web servers in public subnets (internet-accessible), application and database servers in private subnets (no direct internet route). Security Groups act as stateful virtual firewalls at the instance level — the application-layer SG only accepts traffic from the web-layer SG, and the DB SG only from the app-layer SG. This implements defence-in-depth without any single perimeter.',
    chooseTwo: true, correctCount: 2, order: 9,
  },
  // ── Q64: CloudTrail audit ─────────────────────────────────────────────────
  {
    questionNumber: 'Q64',
    questionText: 'Q64) Which AWS service records every API call made in an AWS account — including calls from the Console, CLI, and SDKs — for compliance auditing and security analysis?',
    options: [
      { text: 'Amazon CloudWatch Logs', correct: false },
      { text: 'AWS CloudTrail', correct: true },
      { text: 'AWS Config', correct: false },
      { text: 'Amazon GuardDuty', correct: false },
    ],
    explanation: "AWS CloudTrail is the primary governance and compliance service for AWS accounts. Every API call is recorded as an event: who called it (IAM identity), from where (IP, user agent), when (timestamp), and what changed (request/response). This provides a complete, immutable audit trail — equivalent to the 'logs collection' pattern used in this application to track admin import actions.",
    chooseTwo: false, correctCount: 1, order: 10,
  },
];

async function seedAdmin() {
  const exists = await User.findOne({ username: 'admin1234' });
  if (!exists) {
    await User.create({
      username: 'admin1234',
      password: 'rootuser@1234',  // pre-save hook hashes this
      role: 'admin',
      permissions: { viewExams: true, takeExams: true, importQuestions: true, manageUsers: true },
    });
    console.log('[Seed] Admin user created (admin1234)');
  }
}

async function seedExamData() {
  const exists = await ExamSet.findOne({ title: /CloudDeck Starter/i });
  if (exists) { console.log('[Seed] Exam data already present'); return; }

  const admin = await User.findOne({ username: 'admin1234' });
  const set   = await ExamSet.create({
    title: 'CloudDeck Starter — CLF-C02 Practice Set',
    category: 'Cloud Practitioner',
    description: 'Core AWS concepts: storage economics, serverless, HA, security, and pricing. Includes Choose Two multi-select questions (Q4, Q10, Q19, Q42, Q52).',
    tags: ['CLF-C02', 'Fundamentals', 'Security', 'Pricing', 'ChooseTwo'],
    metadata: new Map([
      ['Category',   'Cloud Practitioner'],
      ['Exam Code',  'CLF-C02'],
      ['Difficulty', 'Mixed'],
      ['Source',     'CloudDeck Seed v3'],
    ]),
    createdBy:     admin?._id,
    questionCount: SEED_QUESTIONS.length,
    isPublished:   true,
  });

  await Question.insertMany(
    SEED_QUESTIONS.map(q => ({ ...q, examSetId: set._id }))
  );
  console.log(`[Seed] ${SEED_QUESTIONS.length} questions seeded into "${set.title}"`);
}

module.exports = { seedAdmin, seedExamData };
