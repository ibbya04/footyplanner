const DIRECTIVE = /^\s*(eslint-|global\s|@ts-expect-error\b)|^\/\s*<reference\s/;

export const noComments = {
    meta: {
        type: 'suggestion',
        messages: { comment: 'No comments in code. Name things clearly, or record the reason in an ADR.' },
        schema: [],
    },
    create(context) {
        return {
            Program() {
                for (const comment of context.sourceCode.getAllComments()) {
                    if (comment.type === 'Shebang' || DIRECTIVE.test(comment.value)) continue;
                    context.report({ loc: comment.loc, messageId: 'comment' });
                }
            },
        };
    },
};
