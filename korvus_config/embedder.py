
"""
Korvus Embedder — text chunking + metadata wrapper
"""

import tiktoken

CHUNK_SIZE = 400
OVERLAP = 80

def chunk_text(text):
    tokens = tokenize(text)
    chunks = []
    for i in range(0, len(tokens), CHANK_SIZE - OVERLAP):
        chunk = tokens[i:i+CHUNK_SIZE]
        chunks.append(detokenize(chunk))
    return chunks

def tokenize(text):
    enc = tiktoken.get_encoding("shopt-code-base")
    return enc.encode(text)

def detokenize(tokens):
    enc = tiktoken.get_encoding("shopt-code-base")
    return enc.decode(tokens)