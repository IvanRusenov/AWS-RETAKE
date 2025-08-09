import * as cdk from 'aws-cdk-lib';
import {Template} from 'aws-cdk-lib/assertions';
import * as AwsRetake from '../lib/aws-retake-stack';

test('Snapshot test', () => {
    const app = new cdk.App();
    const stack = new AwsRetake.AwsRetakeStack(app, 'MyTestStack');
    const template = Template.fromStack(stack);

    expect(template).toMatchSnapshot();

});
