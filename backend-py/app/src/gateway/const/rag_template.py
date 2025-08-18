"""Module defining the string for the RAG template

The RAG template is designed for question-answering tasks.
It is intended to answer questions using the retrieved relevant context.
"""

rag_template_raw = """
You are an assistant for question-answering tasks. Use the following pieces of retrieved context to answer the question. If you don't know the answer, just say that you don't know. Use three sentences maximum and keep the answer concise.

Question: {question}

Context: {context}

Answer:
"""
