export class ScheduleModel{
    Id: number;
    CategoryName: string;
    ParentId?: number;
    Name: string;
    Description: string;
    StartDate: Date;
    EndDate: Date;
    Complete: number;
}