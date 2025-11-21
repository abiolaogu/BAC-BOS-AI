import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/database';

export class ReadReceipt extends Model {
  public id!: string;
  public messageId!: string;
  public userId!: string;
  public readAt!: Date;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

ReadReceipt.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    messageId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'messages',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    readAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'read_receipts',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['messageId', 'userId'],
      },
      { fields: ['userId'] },
    ],
  }
);

export default ReadReceipt;
