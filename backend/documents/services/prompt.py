def build_rag_prompt(question: str, chunks: list[dict]) -> str:
    if not chunks:
        return (
            "You are answering questions about a user's uploaded documents.\n"
            "No relevant content was retrieved from the user's documents.\n"
            "Respond exactly: \"I couldn't find this in your documents.\"\n"
            f"\nUser question: {question}"
        )

    context = "\n\n---\n\n".join(
        f"[Document: {c['document_name']} | chunk {c['chunk_index']}]\n{c['content']}"
        for c in chunks
    )
    return (
        "You are a helpful, precise assistant answering questions about a user's uploaded documents.\n\n"
        "### Relevant Document Context\n"
        f"{context}\n\n"
        "### Instructions\n"
        "- Answer using ONLY the document context above.\n"
        "- If the answer is not contained in the context, respond exactly: "
        "\"I couldn't find this in your documents.\"\n"
        "- Do not guess or use outside knowledge.\n"
        "- Be concise; cite the document name if helpful.\n\n"
        f"User Question: {question}\nAnswer:"
    )