import { TimestreamWriteClient, WriteRecordsCommand, MeasureValueType, TimeUnit } from '@aws-sdk/client-timestream-write';

const timestreamClient = new TimestreamWriteClient({ region: process.env.AWS_REGION });

interface SampleData {
    deviceId: string;
    temperature: number;
}

export const handler = async (event: any) => {
    console.info('event:', event);
    
    try {
        
        const databaseName = process.env.TIMESTREAM_DATABASE_NAME;
        const tableName = process.env.TIMESTREAM_TABLE_NAME;
        
        if (!databaseName || !tableName) {
            throw new Error('Database name or table name is not configured');
        }
        
        // 現在時刻をベースにタイムスタンプを生成
        const baseTime = Date.now();
        
        // TimeStreamに書き込むレコードを準備
        const records = SAMPLE_DATA.map((data, index) => ({
            Dimensions: [
                {
                    Name: 'device_id',
                    Value: 'device-001'
                }
            ],
            MeasureName: 'sensor_data',
            MeasureValue: data.temperature.toString(), // TimeStreamのAPIでは、数値データでも文字列として送信する必要がある
            MeasureValueType: MeasureValueType.DOUBLE,
            Time: (baseTime + index * 1000).toString(), // 現在時刻から1秒間隔で動的に生成
            TimeUnit: TimeUnit.MILLISECONDS
        }));
        
        // TimeStreamにデータを書き込み
        const command = new WriteRecordsCommand({
            DatabaseName: databaseName,
            TableName: tableName,
            Records: records
        });
        
        const response = await timestreamClient.send(command);
        console.info('Successfully wrote records to TimeStream:', response);
        
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Successfully wrote records to TimeStream',
                recordsCount: records.length
            })
        };
        
    } catch (error) {
        console.error('Error writing to TimeStream:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Error writing to TimeStream',
                error: error instanceof Error ? error.message : 'Unknown error'
            })
        };
    }
};

const SAMPLE_DATA: SampleData[] = [
    { "deviceId": "device-001", "temperature": 15.2 },
    { "deviceId": "device-001", "temperature": 17.8 },
    { "deviceId": "device-001", "temperature": 19.5 },
    { "deviceId": "device-001", "temperature": 22.1 },
    { "deviceId": "device-001", "temperature": 24.7 },
    { "deviceId": "device-001", "temperature": 26.3 },
    { "deviceId": "device-001", "temperature": 28.9 },
    { "deviceId": "device-001", "temperature": 31.2 },
    { "deviceId": "device-001", "temperature": 33.6 },
    { "deviceId": "device-001", "temperature": 35.4 },
    { "deviceId": "device-001", "temperature": 37.8 },
    { "deviceId": "device-001", "temperature": 39.1 },
    { "deviceId": "device-001", "temperature": 38.5 },
    { "deviceId": "device-001", "temperature": 36.2 },
    { "deviceId": "device-001", "temperature": 34.8 },
    { "deviceId": "device-001", "temperature": 32.4 },
    { "deviceId": "device-001", "temperature": 29.7 },
    { "deviceId": "device-001", "temperature": 27.1 },
    { "deviceId": "device-001", "temperature": 25.3 },
    { "deviceId": "device-001", "temperature": 23.6 }
] 
