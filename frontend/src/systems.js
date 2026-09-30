// Production work, described at a high level (client details are confidential).
export const systems = [
  { org: 'Deloitte', title: 'Order automation', what: 'Turns customer emails into validated SAP orders.', flow: 'Email → Lambda → PostgreSQL → SAP', stack: ['AWS Lambda', 'API Gateway', 'PostgreSQL', 'SAP'] },
  { org: 'Deloitte', title: 'Conversational analytics agent', what: 'Multi-agent Text-to-SQL and FAQ answers over a data warehouse.', flow: 'Question → agents → SQL → answer', stack: ['LangGraph', 'Claude', 'Redshift'] },
  { org: 'Cognizant', title: 'Denial letter automation', what: 'Agentic pipeline that extracts case details and drafts standard letters.', flow: 'Records → LLM extract → letter', stack: ['LLMs', 'Agents', 'Python'] },
  { org: 'Cognizant', title: 'Vendor email processing', what: 'Reads emails and attachments, classifies grievances, structures the data.', flow: 'Email → Document AI → classify', stack: ['GCP Document AI', 'GenAI'] },
  { org: 'Cognizant', title: 'Duplicate complaint filter', what: 'Clusters complaints from many sources to flag duplicates and prioritise.', flow: 'Complaints → embed → cluster', stack: ['Clustering', 'NLP'] },
  { org: 'Cognizant', title: 'RAG chatbots', what: 'Enterprise question answering behind high-concurrency APIs.', flow: 'Query → retrieve → generate', stack: ['OpenAI', 'BERT', 'FastAPI'] },
]
