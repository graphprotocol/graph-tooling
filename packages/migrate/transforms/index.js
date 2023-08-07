// @ts-check
import { JSCodeshift } from 'jscodeshift';
export default function (file, api, options) {
  /** @type {import('jscodeshift').JSCodeshift} */
  const j = api.jscodeshift;

  const source = j(file.source);

  // Find expression statements that are AssignmentExpressions
  source
    .find(j.ExpressionStatement, {
      type: 'ExpressionStatement',
      expression: {
        type: 'AssignmentExpression',
        operator: '+=',
      },
    })
    .replaceWith(path => {
      if (path.node.expression.type === 'AssignmentExpression') {
        const currentLeftExpression = path.node.expression.left;

        console.log('currentLeftExpression', currentLeftExpression);
        // console.log('path.node.expression.operator', path.node.expression.operator);
      }
    });

  // return source.toSource();
  // console.log('source', assignmentExpressions);
}

export const parser = 'ts';
