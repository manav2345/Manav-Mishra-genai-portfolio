export const profile = {
  name: 'Manav Mishra',
  title: 'Data Science & AI Consultant',
  email: 'manavmishra300@gmail.com',
  phone: '+91 9756631341',
  location: 'Noida, India',
  linkedin: 'https://www.linkedin.com/in/manav-mishra-02b9691ba/',
  github: 'https://github.com/manav2345',
  resume: '/Manav_Mishra_Resume.pdf', // put the PDF in frontend/public/
  summary:
    'Four years of enterprise experience in generative AI, machine learning and multi-cloud data platforms. I turn language models into systems that read emails, query databases and draft documents inside real business workflows.',
}

export const experience = [
  {
    company: 'Deloitte',
    role: 'AI & Data Science',
    dates: 'Feb 2026 – now',
    points: [
      'Built a serverless order-automation pipeline on AWS Lambda and API Gateway. It structures email orders in PostgreSQL and checks inventory, entities and order simulation against SAP ERP.',
      'Built a multi-agent Text-to-SQL and FAQ assistant with LangChain, LangGraph, Claude and Amazon Redshift that gives context-aware answers to business questions.',
    ],
  },
  {
    company: 'Cognizant',
    role: 'Data Scientist',
    dates: 'Jan 2022 – Feb 2026',
    points: [
      'Automated denial letters with an agentic document pipeline that extracts member and service details and standardizes the output.',
      'Built a GenAI engine on Google Cloud Document AI that reads vendor emails, classifies grievances and structures attachments.',
      'Developed a clustering pipeline that flags duplicate vendor complaints across sources.',
      'Shipped RAG chatbots on OpenAI and BERT behind high-concurrency FastAPI backends.',
      'Created a Text-to-SQL agent so non-technical stakeholders can query relational data in plain English.',
    ],
  },
  {
    company: 'Samsung Electronics',
    role: 'Research Intern',
    dates: 'Aug – Nov 2021',
    points: ['Applied ML research and geospatial data-processing algorithms for Samsung Maps.'],
  },
]

export const skills = [
  ['Generative AI', 'GPT-4, Llama 3, Claude, Gemini, RAG, Agentic AI, LangChain, LangGraph, LoRA / QLoRA, prompt engineering'],
  ['ML and deep learning', 'PyTorch, TensorFlow, scikit-learn, Transformers, BERT, gradient boosting, clustering'],
  ['Backend and data', 'Python, SQL, FastAPI, REST, ETL / ELT, PostgreSQL, MongoDB, vector search'],
  ['Cloud', 'AWS Lambda, API Gateway, Redshift, OpenSearch, GCP Document AI, GKE, Azure'],
  ['MLOps', 'Docker, Kubernetes, Jenkins, GitHub Actions, CI/CD'],
]

export const certifications = [
  ['Azure AI Engineer Associate', '2023'],
  ['Azure Data Engineer Associate', '2023'],
  ['Azure Data Scientist Associate', '2024'],
  ['AWS Certified AI Practitioner', '2024'],
  ['Oracle Certified Associate: AI Foundations', '2024'],
]

export const repos = [
  ['LLM Q&A Web App', 'Question answering with an LLM, retrieval and an interactive frontend.', 'https://github.com/manav2345/LLM-Q-A-Web-App'],
  ['Twitter Sentiment Analysis', 'Multi-class emotion classification with deep learning and NLP preprocessing.', 'https://github.com/manav2345/Twitter-Sentiment-Analysis'],
  ['Titanic Survival Prediction', 'Classification with exploratory analysis and feature engineering.', 'https://github.com/manav2345/Titanic'],
]

export const education = [
  ['MBA (Honors), Artificial Intelligence', 'Graphic Era, 2025 – now'],
  ['B.Tech (Honors), CSE – AI & Data Science', 'Graphic Era, 2018 – 2022'],
]
