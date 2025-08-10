import * as cdk from 'aws-cdk-lib';
import {Construct} from 'constructs';
import {Bucket} from "aws-cdk-lib/aws-s3";
import {AttributeType, BillingMode, Table} from "aws-cdk-lib/aws-dynamodb";
import {Subscription, SubscriptionProtocol, Topic} from "aws-cdk-lib/aws-sns";
import {NodejsFunction} from "aws-cdk-lib/aws-lambda-nodejs";
import {Runtime} from "aws-cdk-lib/aws-lambda";
import * as path from "node:path";
import {Cors, LambdaIntegration, RestApi} from "aws-cdk-lib/aws-apigateway";
import {BucketDeployment, Source} from "aws-cdk-lib/aws-s3-deployment";
import {aws_iam, CfnOutput} from "aws-cdk-lib";

export class AwsRetakeStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);



        const adminRole = new aws_iam.Role(this, 'adminRole', {
            assumedBy: new aws_iam.CompositePrincipal(
                new aws_iam.ServicePrincipal('lambda.amazonaws.com'),
                new aws_iam.ServicePrincipal('apigateway.amazonaws.com'),
            ),
            managedPolicies: [
                aws_iam.ManagedPolicy.fromAwsManagedPolicyName('AdministratorAccess')
            ]
        });

// S3 Bucket for website
        const websiteBucket = new Bucket(this, 'CatLoversWebsiteBucket', {
            websiteIndexDocument: 'index.html',
            publicReadAccess: true,
            blockPublicAccess: {
                blockPublicAcls: false,
                blockPublicPolicy: false,
                ignorePublicAcls: false,
                restrictPublicBuckets: false
            },
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });

        const bucketDeployment = new BucketDeployment(this, "indexDeployment", {
            sources: [Source.asset(path.join(__dirname, "../resources"))],
            destinationBucket: websiteBucket
        });

        // DynamoDB Table (Single Table Design)
        const table = new Table(this, 'FavoriteCatsTable', {
            partitionKey: {name: 'PK', type: AttributeType.STRING},
            sortKey: {name: 'SK', type: AttributeType.STRING},
            billingMode: BillingMode.PAY_PER_REQUEST,
        });

        // SNS Topic for notifications
        const topic = new Topic(this, 'NewFavoriteCatTopic');

        new Subscription(this, "subscription", {
            topic: topic,
            protocol: SubscriptionProtocol.EMAIL,
            endpoint: "i_rusenov@abv.bg"
        });

        //Function
        const saveCatLambda = new NodejsFunction(this, "saveCatLambda", {
            handler: "handler",
            runtime: Runtime.NODEJS_20_X,
            entry: path.join(__dirname, "../src/saveCatLambda.ts"),
            role: adminRole,
            environment: {
                TABLE_NAME: table.tableName,
                TOPIC_ARN: topic.topicArn,
            }
        });

        // Grant permissions
        table.grantReadWriteData(saveCatLambda);
        topic.grantPublish(saveCatLambda);

        // API Gateway
        const api = new RestApi(this, 'CatLoversApi', {
            defaultCorsPreflightOptions: {
                allowOrigins: Cors.ALL_ORIGINS,
                allowMethods: Cors.ALL_METHODS,
                allowHeaders: ['Content-Type'],
                statusCode: 200
            },
            policy: new aws_iam.PolicyDocument({
                statements: [
                    new aws_iam.PolicyStatement({
                        actions: ['execute-api:Invoke'],
                        resources: ['execute-api:/*/*/*'],
                        principals: [new aws_iam.AnyPrincipal()],
                        effect: aws_iam.Effect.ALLOW,
                        conditions: {
                            'IpAddress': {
                                'aws:SourceIp': ['0.0.0.0/0']
                            }
                        }
                    })
                ]
            })
        });

        api.root.addResource("saveCat")
            .addMethod("POST", new LambdaIntegration(saveCatLambda, {proxy: true}));


        new CfnOutput(this, "websiteUrl", {
            key: "websiteUrl",
            value: websiteBucket.bucketWebsiteUrl
        });

        new CfnOutput(this, "ApiGatewayUrl", {
            key: "ApiGatewayUrl",
            value: api.url
        });

    }
}
