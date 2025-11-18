
import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { BudgetService } from './budget.service';

@ApiTags('budget')
@Controller('budget')
export class BudgetController {
  constructor(private readonly budgetService: BudgetService) {}

  @Get()
  @ApiOperation({ summary: 'Get current month budget status' })
  @ApiResponse({ status: 200, description: 'Returns budget status for current month' })
  async getCurrentBudget() {
    return this.budgetService.getCurrentMonthBudget();
  }

  @Get('history')
  @ApiOperation({ summary: 'Get budget history' })
  @ApiQuery({ name: 'months', required: false, description: 'Number of months to fetch (default: 6)' })
  @ApiResponse({ status: 200, description: 'Returns budget history' })
  async getBudgetHistory(@Query('months') months?: string) {
    const monthsNumber = months ? parseInt(months, 10) : 6;
    return this.budgetService.getBudgetHistory(monthsNumber);
  }

  @Get('can-spend')
  @ApiOperation({ summary: 'Check if budget allows more spending' })
  @ApiResponse({ status: 200, description: 'Returns whether more spending is allowed' })
  async canSpendMore() {
    const canSpend = await this.budgetService.canSpendMore();
    const recommended = await this.budgetService.getRecommendedDailyBudget();

    return {
      canSpend,
      recommendedDailyBudget: recommended,
    };
  }
}
